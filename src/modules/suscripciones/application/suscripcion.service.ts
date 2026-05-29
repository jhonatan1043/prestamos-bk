import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { TenantContextService } from '../../../common/tenant/tenant-context.service';
import type { ISuscripcionRepository } from '../domain/repositories/suscripcion.repository';
import type { IPlanRepository } from '../domain/repositories/plan.repository';
import { CreateSuscripcionDto } from './dto/create-suscripcion.dto';
import { RenovarSuscripcionDto } from './dto/renovar-suscripcion.dto';
import { PaymentsService } from '../../payments/application/payments.service';

@Injectable()
export class SuscripcionService {
  constructor(
    @Inject('ISuscripcionRepository')
    private readonly suscripcionRepository: ISuscripcionRepository,
    @Inject('IPlanRepository')
    private readonly planRepository: IPlanRepository,
    private readonly tenantCtx: TenantContextService,
    private readonly paymentsService: PaymentsService,
  ) {}

  private getTenantId(): number {
    const id = this.tenantCtx.getTenantId();
    if (!id) throw new ConflictException('No hay tenant activo en el contexto');
    return id;
  }

  async activar(dto: CreateSuscripcionDto) {
    const tenantId = this.getTenantId();

    const plan = await this.planRepository.findById(dto.planId);
    if (!plan)       throw new NotFoundException('Plan no encontrado');
    if (!plan.activo) throw new ConflictException('El plan seleccionado no está activo');

    // Cancelar suscripción activa anterior de este tenant
    const actual = await this.suscripcionRepository.findActiva(tenantId);
    if (actual) {
      await this.suscripcionRepository.update(actual.id, { estado: 'CANCELADA' });
    }

    return this.suscripcionRepository.create({
      tenantId,
      planId:      dto.planId,
      fechaInicio: new Date(dto.fechaInicio),
      fechaFin:    dto.fechaFin ? new Date(dto.fechaFin) : undefined,
      estado:      'ACTIVA',
    });
  }

  async findActiva() {
    const tenantId    = this.getTenantId();
    const suscripcion = await this.suscripcionRepository.findActiva(tenantId);
    if (!suscripcion) throw new NotFoundException('No hay suscripción activa para este tenant');
    return suscripcion;
  }

  async findByTenant() {
    const tenantId = this.getTenantId();
    return this.suscripcionRepository.findByTenant(tenantId);
  }

  async findAll() {
    return this.suscripcionRepository.findAll();
  }

  async cancelar(id: number) {
    const suscripcion = await this.suscripcionRepository.findById(id);
    if (!suscripcion) throw new NotFoundException('Suscripción no encontrada');
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
    const tenantId = this.getTenantId();

    // 1. Verificar pago aprobado
    await this.paymentsService.validatePagoAprobado(dto.reference, dto.planId);

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
    const fechaInicio = new Date();
    const fechaFin    = new Date(fechaInicio);
    fechaFin.setDate(fechaFin.getDate() + ((plan as any).duracionDias ?? 30));

    const nueva = await this.suscripcionRepository.create({
      tenantId,
      planId:      dto.planId,
      fechaInicio,
      fechaFin,
      estado:      'ACTIVA',
    });

    // 5. Vincular pago al tenant (evitar doble uso)
    await this.paymentsService.vincularTenant(dto.reference, tenantId);

    return nueva;
  }
}
