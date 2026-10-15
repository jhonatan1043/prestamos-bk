import { Injectable, Inject, NotFoundException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { TenantContextService } from '../../../common/tenant/tenant-context.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { ISuscripcionRepository } from '../domain/repositories/suscripcion.repository';
import type { IPlanRepository } from '../domain/repositories/plan.repository';
import { CreateSuscripcionDto } from './dto/create-suscripcion.dto';
import { RenovarSuscripcionDto } from './dto/renovar-suscripcion.dto';
import { PaymentsService } from '../../payments/application/payments.service';

/**
 * Gestiona suscripciones operando ÚNICAMENTE sobre el esquema principal (tst).
 * No hay copia en el schema del tenant — fuente de verdad única.
 */
@Injectable()
export class SuscripcionService {
  private readonly logger = new Logger(SuscripcionService.name);

  constructor(
    @Inject('ISuscripcionRepository')
    private readonly suscripcionRepository: ISuscripcionRepository,
    @Inject('IPlanRepository')
    private readonly planRepository: IPlanRepository,
    private readonly tenantCtx: TenantContextService,
    private readonly paymentsService: PaymentsService,
    private readonly mainPrisma: PrismaService,
  ) {}

  /**
   * Resuelve el tenantId del contexto activo.
   *
   * Estrategia doble:
   *  1. Usa tenantId del AsyncLocalStorage (viene en el JWT via TenantInterceptor).
   *  2. Si es 0 (JWT viejo sin tenantId), busca el tenant por schemaName en el
   *     esquema principal. Esto garantiza que renovar() siempre tenga un tenantId válido.
   */
  private async resolverTenantId(): Promise<number> {
    const id = this.tenantCtx.getTenantId();
    if (id) return id;

    // Fallback: buscar por schemaName en el esquema principal
    const schemaName = this.tenantCtx.getSchema();
    const mainSchema = process.env.MAIN_SCHEMA ?? 'master';
    if (!schemaName || schemaName === mainSchema) {
      throw new ConflictException('No hay tenant activo en el contexto');
    }

    const tenant = await this.mainPrisma.tenant.findUnique({
      where:  { schemaName },
      select: { id: true },
    });
    if (!tenant?.id) {
      throw new ConflictException(`Tenant con esquema "${schemaName}" no encontrado`);
    }
    return tenant.id;
  }

  /** Versión síncrona para métodos que no necesitan el fallback */
  private getTenantId(): number {
    const id = this.tenantCtx.getTenantId();
    if (!id) throw new ConflictException('No hay tenant activo en el contexto');
    return id;
  }

  /**
   * Activa un plan GRATUITO para la empresa actual. Los planes de pago solo se
   * activan con renovar() (pago Wompi aprobado) o por el superadmin vía
   * POST /tenants/:id/plan. Las fechas se calculan aquí, no se aceptan del cliente.
   */
  async activar(dto: CreateSuscripcionDto) {
    const tenantId = await this.resolverTenantId();

    const plan = await this.planRepository.findById(dto.planId);
    if (!plan)        throw new NotFoundException('Plan no encontrado');
    if (!plan.activo) throw new ConflictException('El plan seleccionado no está activo');
    if (Number(plan.precio) > 0) {
      throw new ForbiddenException('Los planes de pago se activan mediante un pago aprobado (POST /suscripciones/renovar)');
    }

    // Un plan gratuito con vencimiento (prueba) solo se puede usar una vez
    const duracion = (plan as any).duracionDias ?? 0;
    if (duracion > 0) {
      const historial = await this.suscripcionRepository.findByTenant(tenantId);
      if (historial.some(s => s.planId === plan.id)) {
        throw new ConflictException('El periodo gratuito de este plan ya fue utilizado');
      }
    }

    const fechaInicio = new Date();
    let   fechaFin: Date | undefined;
    if (duracion > 0) {
      fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaFin.getDate() + duracion);
    }

    // Cancelar suscripción activa anterior en esquema principal
    const actual = await this.suscripcionRepository.findActiva(tenantId);
    if (actual) {
      await this.suscripcionRepository.update(actual.id, { estado: 'CANCELADA' });
    }

    const nueva = await this.suscripcionRepository.create({
      tenantId,
      planId:  dto.planId,
      fechaInicio,
      fechaFin,
      estado: 'ACTIVA',
    });

    return nueva;
  }

  async findActiva() {
    const tenantId    = await this.resolverTenantId();
    const suscripcion = await this.suscripcionRepository.findActiva(tenantId);
    if (!suscripcion) throw new NotFoundException('No hay suscripción activa para este tenant');
    return suscripcion;
  }

  async findByTenant() {
    const tenantId = await this.resolverTenantId();
    return this.suscripcionRepository.findByTenant(tenantId);
  }

  async findAll() {
    return this.suscripcionRepository.findAll();
  }

  async cancelar(id: number) {
    const tenantId    = await this.resolverTenantId();
    const suscripcion = await this.suscripcionRepository.findById(id);
    if (!suscripcion || suscripcion.tenantId !== tenantId) {
      throw new NotFoundException('Suscripción no encontrada');
    }
    return this.suscripcionRepository.update(id, { estado: 'CANCELADA' });
  }

  /**
   * Renueva la suscripción del tenant activo tras un pago aprobado en Wompi.
   *
   * Flujo:
   *  1. Valida que el pago exista, esté APPROVED y no haya sido usado.
   *  2. Cancela la suscripción activa anterior (si existe).
   *  3. Crea una nueva suscripción con fechaFin = hoy + plan.duracionDias.
   *  4. Vincula el pago al tenant para evitar reusos.
   */
  async renovar(dto: RenovarSuscripcionDto) {
    // Usa resolverTenantId para manejar JWTs sin tenantId (busca por schemaName)
    const tenantId = await this.resolverTenantId();

    // 1. Verificar pago aprobado y reservarlo para este tenant (atómico: evita
    //    que la misma referencia se use dos veces en peticiones simultáneas)
    const pago = await this.paymentsService.validatePagoAprobado(dto.reference, dto.planId);
    await this.paymentsService.reclamarPago(dto.reference, tenantId);

    // 2. Obtener el plan
    const plan = await this.planRepository.findById(dto.planId);
    if (!plan)       throw new NotFoundException('Plan no encontrado');
    if (!plan.activo) throw new ConflictException('El plan seleccionado no está activo');

    // 3. Cancelar suscripción activa anterior
    const actual = await this.suscripcionRepository.findActiva(tenantId);
    if (actual) {
      await this.suscripcionRepository.update(actual.id, { estado: 'CANCELADA' });
    }

    // 4. Crear nueva suscripción
    // periodoAnual → 365 días; duracionDias === 0 → sin vencimiento
    const baseDuracion = (plan as any).duracionDias ?? 30;
    // El periodo lo define lo que realmente se pagó, no lo que envía el cliente
    const duracion     = (pago.periodoAnual && baseDuracion > 0) ? 365 : baseDuracion;
    const fechaInicio  = new Date();
    let   fechaFin: Date | undefined;
    if (duracion > 0) {
      fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaFin.getDate() + duracion);
    }

    return this.suscripcionRepository.create({
      tenantId,
      planId:  dto.planId,
      fechaInicio,
      fechaFin,
      estado:  'ACTIVA',
    });
  }
}
