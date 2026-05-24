import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { ITenantRepository } from '../domain/repositories/tenant.repository';
import { SchemaProvisionerService } from '../infrastructure/schema-provisioner.service';
import { CreateTenantDto }     from './dto/create-tenant.dto';
import { UpdateTenantDto }     from './dto/update-tenant.dto';
import { CreatePagoTenantDto } from './dto/create-pago-tenant.dto';
import { PaymentsService }     from '../../payments/application/payments.service';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    @Inject('ITenantRepository')
    private readonly repo: ITenantRepository,
    private readonly provisioner: SchemaProvisionerService,
    private readonly prisma: PrismaService,         // esquema principal para suscripciones
    private readonly paymentsService: PaymentsService,
  ) {}

  // ─── Tenants ──────────────────────────────────────────────────────────────

  async create(dto: CreateTenantDto) {
    const existingEmail = await this.repo.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException(`El email "${dto.email}" ya está registrado para otro tenant`);
    }

    // ── Validar pago si el plan no es gratuito ─────────────────────────────
    const planCheck = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    const esPlanDePago = planCheck && Number(planCheck.precio) > 0;

    if (esPlanDePago) {
      if (!dto.paymentReference) {
        throw new BadRequestException(
          'El plan seleccionado requiere pago. ' +
          'Completa el proceso de pago y envía el campo paymentReference.',
        );
      }
      // Lanza excepción si el pago no es válido/aprobado/ya fue usado
      await this.paymentsService.validatePagoAprobado(dto.paymentReference, dto.planId);
    }

    let schemaName = dto.schemaSlug
      ? `tenant_${dto.schemaSlug}`
      : this.provisioner.generateSchemaName(dto.nombre);

    const existingSchema = await this.repo.findBySchema(schemaName);
    if (existingSchema) {
      schemaName = `${schemaName}_${Date.now().toString().slice(-6)}`;
    }

    // 1. Persistir el tenant
    const tenant = await this.repo.create({
      nombre:    dto.nombre,
      email:     dto.email,
      telefono:  dto.telefono ?? null,
      schemaName,
      planId:    dto.planId,
      estado:    'ACTIVO',
      notas:     dto.notas ?? null,
    });

    // 2. Crear esquema, migrar y crear usuario admin
    let adminUser: { nombre: string; email: string; password: string; role: string };
    try {
      await this.provisioner.crearEsquema(schemaName);
      await this.provisioner.ejecutarMigraciones(schemaName);
      await this.provisioner.sembrarDatosTenant(schemaName, dto.planId, {
        id:       tenant.id,
        nombre:   tenant.nombre,
        email:    tenant.email,
        telefono: tenant.telefono ?? null,
      });
      adminUser = await this.provisioner.crearUsuarioAdmin(schemaName, dto.nombre);
    } catch (error: any) {
      this.logger.error(`Error al provisionar esquema para tenant #${tenant.id}: ${error.message}`);
      await this.repo.update(tenant.id, { estado: 'SUSPENDIDO', notas: `Error de provisión: ${error.message}` });
      throw error;
    }

    // 3. Crear suscripción inicial en el esquema principal
    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    const esPlanGratis = plan ? Number(plan.precio) === 0 : true;

    // 3a. Si hubo pago, registrarlo en PagoTenant y vincular la transacción Wompi
    if (!esPlanGratis && dto.paymentReference) {
      await this.repo.createPago({
        tenantId:   tenant.id,
        monto:      Number(plan!.precio),
        concepto:   `Pago plan ${plan!.nombre} — Wompi`,
        fecha:      new Date(),
        referencia: dto.paymentReference,
      });
      await this.paymentsService.vincularTenant(dto.paymentReference, tenant.id);
    }

    const suscripcion = await this.prisma.suscripcion.create({
      data: {
        tenantId:    tenant.id,
        planId:      dto.planId,
        fechaInicio: new Date(),
        // Plan gratis → no vence. Planes de pago → 30 días por defecto (renovar manualmente)
        fechaFin:    esPlanGratis ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        estado:      'ACTIVA',
      },
      include: { plan: true },
    });

    return {
      tenant,
      suscripcion: {
        id:          suscripcion.id,
        plan:        suscripcion.plan.nombre,
        fechaInicio: suscripcion.fechaInicio,
        fechaFin:    suscripcion.fechaFin ?? null,
        vence:       suscripcion.fechaFin ? 'en 30 días' : 'No vence',
      },
      adminUser: {
        nombre:   adminUser.nombre,
        email:    adminUser.email,
        password: adminUser.password,
        role:     adminUser.role,
        nota:     'Guarda esta contraseña, no se volverá a mostrar.',
      },
    };
  }

  async findAll() {
    return this.repo.findAll();
  }

  async findOne(id: number) {
    const tenant = await this.repo.findById(id);
    if (!tenant) throw new NotFoundException(`Tenant #${id} no encontrado`);
    return tenant;
  }

  async verificarEmpresa(schemaName: string) {
    const tenant = await this.repo.findBySchema(schemaName);
    if (!tenant) throw new NotFoundException(`No se encontró ninguna empresa con el identificador "${schemaName}"`);
    if (tenant.estado !== 'ACTIVO') throw new BadRequestException(`La empresa "${tenant.nombre}" no está activa`);
    return { id: tenant.id, nombre: tenant.nombre, schemaName: tenant.schemaName };
  }

  async update(id: number, dto: UpdateTenantDto) {
    await this.findOne(id);
    if (dto.email) {
      const existing = await this.repo.findByEmail(dto.email);
      if (existing && existing.id !== id) {
        throw new ConflictException(`El email "${dto.email}" ya pertenece a otro tenant`);
      }
    }
    return this.repo.update(id, dto);
  }

  async remove(id: number) {
    const tenant = await this.findOne(id);
    if (tenant.estado === 'ACTIVO') {
      throw new BadRequestException('No se puede eliminar un tenant ACTIVO. Primero cancélalo o suspenlo.');
    }
    await this.repo.delete(id);
    return { mensaje: 'Tenant eliminado' };
  }

  async reprovision(id: number) {
    const tenant = await this.findOne(id) as any;
    await this.provisioner.crearEsquema(tenant.schemaName);
    await this.provisioner.ejecutarMigraciones(tenant.schemaName);
    await this.provisioner.sembrarDatosTenant(tenant.schemaName, tenant.planId, {
      id:       tenant.id,
      nombre:   tenant.nombre,
      email:    tenant.email,
      telefono: tenant.telefono ?? null,
    });
    return this.repo.update(id, { estado: 'ACTIVO' });
  }

  // ─── Gestión de plan/suscripción ──────────────────────────────────────────

  /**
   * Cambia o renueva el plan de un tenant.
   * Cancela la suscripción activa y crea una nueva.
   * @param meses Duración en meses (0 = sin vencimiento, solo para plan gratis)
   */
  async cambiarPlan(id: number, planId: number, meses: number = 1) {
    const tenant = await this.findOne(id);

    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.activo) throw new NotFoundException('Plan no encontrado o inactivo');

    // Cancelar suscripción activa actual
    const actual = await this.prisma.suscripcion.findFirst({
      where: { tenantId: id, estado: 'ACTIVA' },
    });
    if (actual) {
      await this.prisma.suscripcion.update({
        where: { id: actual.id },
        data:  { estado: 'CANCELADA' },
      });
    }

    const esPlanGratis = Number(plan.precio) === 0;
    const fechaFin = esPlanGratis
      ? null
      : new Date(Date.now() + meses * 30 * 24 * 60 * 60 * 1000);

    const nueva = await this.prisma.suscripcion.create({
      data: {
        tenantId:    id,
        planId,
        fechaInicio: new Date(),
        fechaFin,
        estado:      'ACTIVA',
      },
      include: { plan: true },
    });

    // Actualizar planId en el tenant también
    await this.repo.update(id, { planId });

    return {
      mensaje:     `Plan actualizado a "${plan.nombre}"`,
      suscripcion: {
        id:          nueva.id,
        plan:        nueva.plan.nombre,
        fechaInicio: nueva.fechaInicio,
        fechaFin:    nueva.fechaFin ?? null,
        vence:       nueva.fechaFin
          ? `${Math.ceil((nueva.fechaFin.getTime() - Date.now()) / 86_400_000)} días`
          : 'No vence',
      },
    };
  }

  /** Historial de suscripciones de un tenant */
  async historialSuscripciones(id: number) {
    await this.findOne(id);
    return this.prisma.suscripcion.findMany({
      where:   { tenantId: id },
      include: { plan: { select: { nombre: true, precio: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Resumen económico ────────────────────────────────────────────────────

  async resumenEconomico() {
    const tenants = await this.repo.findAll() as any[];
    const resumen = await Promise.all(
      tenants.map(async (t) => {
        const pagos = await this.repo.findPagosByTenant(t.id);
        const totalIngresado = pagos.reduce((sum, p) => sum + Number(p.monto), 0);
        const suscActiva = await this.prisma.suscripcion.findFirst({
          where:   { tenantId: t.id, estado: 'ACTIVA' },
          include: { plan: { select: { nombre: true, precio: true } } },
        });
        return {
          tenantId:       t.id,
          nombre:         t.nombre,
          estado:         t.estado,
          plan:           suscActiva?.plan?.nombre ?? 'Sin plan',
          totalPagos:     pagos.length,
          totalIngresado,
          suscripcionVence: suscActiva?.fechaFin ?? null,
        };
      }),
    );
    return { tenants: resumen, totalGlobal: resumen.reduce((s, r) => s + r.totalIngresado, 0) };
  }

  // ─── Pagos ────────────────────────────────────────────────────────────────

  async registrarPago(tenantId: number, dto: CreatePagoTenantDto) {
    await this.findOne(tenantId);
    return this.repo.createPago({
      tenantId,
      monto:      dto.monto,
      concepto:   dto.concepto,
      fecha:      dto.fecha ? new Date(dto.fecha) : new Date(),
      referencia: dto.referencia ?? null,
    });
  }

  async findPagos(tenantId: number) {
    await this.findOne(tenantId);
    return this.repo.findPagosByTenant(tenantId);
  }

  async findPagoById(tenantId: number, pagoId: number) {
    await this.findOne(tenantId);
    const pago = await this.repo.findPagoById(pagoId);
    if (!pago || pago.tenantId !== tenantId) {
      throw new NotFoundException(`Pago #${pagoId} no encontrado para el tenant #${tenantId}`);
    }
    return pago;
  }
}
