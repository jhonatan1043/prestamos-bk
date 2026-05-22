import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { ITenantRepository } from '../domain/repositories/tenant.repository';
import { SchemaProvisionerService } from '../infrastructure/schema-provisioner.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreatePagoTenantDto } from './dto/create-pago-tenant.dto';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    @Inject('ITenantRepository')
    private readonly repo: ITenantRepository,
    private readonly provisioner: SchemaProvisionerService,
  ) {}

  // ─── Tenants ─────────────────────────────────────────────────────────────

  async create(dto: CreateTenantDto) {
    // Verificar email único
    const existingEmail = await this.repo.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException(`El email "${dto.email}" ya está registrado para otro tenant`);
    }

    // Generar nombre de esquema
    let schemaName = dto.schemaSlug
      ? `tenant_${dto.schemaSlug}`
      : this.provisioner.generateSchemaName(dto.nombre);

    // Garantizar unicidad del esquema (en caso de colisión de slugs)
    const existingSchema = await this.repo.findBySchema(schemaName);
    if (existingSchema) {
      const timestamp = Date.now().toString().slice(-6);
      schemaName = `${schemaName}_${timestamp}`;
    }

    // 1. Persistir el tenant (estado ACTIVO)
    const tenant = await this.repo.create({
      nombre: dto.nombre,
      email: dto.email,
      telefono: dto.telefono ?? null,
      schemaName,
      planId: dto.planId,
      estado: 'ACTIVO',
      notas: dto.notas ?? null,
    });

    // 2. Crear el esquema PostgreSQL y correr migraciones
    //    Se hace después de insertar para que, si falla la migración,
    //    el tenant pueda reintentarse o el esquema ya esté listo.
    try {
      await this.provisioner.crearEsquema(schemaName);
      await this.provisioner.ejecutarMigraciones(schemaName);
    } catch (error: any) {
      this.logger.error(
        `Error al provisionar esquema para tenant #${tenant.id}: ${error.message}`,
      );
      // Marcar como suspendido si el esquema falló, para que el admin pueda reintentar
      await this.repo.update(tenant.id, { estado: 'SUSPENDIDO', notas: `Error de provisión: ${error.message}` });
      throw error;
    }

    return tenant;
  }

  async findAll() {
    return this.repo.findAll();
  }

  async findOne(id: number) {
    const tenant = await this.repo.findById(id);
    if (!tenant) throw new NotFoundException(`Tenant #${id} no encontrado`);
    return tenant;
  }

  async update(id: number, dto: UpdateTenantDto) {
    await this.findOne(id); // valida existencia

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
      throw new BadRequestException(
        'No se puede eliminar un tenant ACTIVO. Primero cancélalo o suspenlo.',
      );
    }
    await this.repo.delete(id);
    return { mensaje: 'Tenant eliminado' };
  }

  /**
   * Re-intenta provisionar el esquema de un tenant suspendido por fallo de migración.
   */
  async reprovision(id: number) {
    const tenant = await this.findOne(id);
    await this.provisioner.crearEsquema(tenant.schemaName);
    await this.provisioner.ejecutarMigraciones(tenant.schemaName);
    return this.repo.update(id, { estado: 'ACTIVO' });
  }

  // ─── Resumen económico ────────────────────────────────────────────────────

  async resumenEconomico() {
    const tenants = await this.repo.findAll() as any[];

    const resumen = await Promise.all(
      tenants.map(async (t) => {
        const pagos = await this.repo.findPagosByTenant(t.id);
        const totalIngresado = pagos.reduce((sum, p) => sum + Number(p.monto), 0);
        return {
          tenantId: t.id,
          nombre: t.nombre,
          estado: t.estado,
          plan: (t as any).plan?.nombre ?? null,
          totalPagos: pagos.length,
          totalIngresado,
        };
      }),
    );

    const totalGlobal = resumen.reduce((s, r) => s + r.totalIngresado, 0);
    return { tenants: resumen, totalGlobal };
  }

  // ─── Pagos ────────────────────────────────────────────────────────────────

  async registrarPago(tenantId: number, dto: CreatePagoTenantDto) {
    await this.findOne(tenantId);
    return this.repo.createPago({
      tenantId,
      monto: dto.monto,
      concepto: dto.concepto,
      fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
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
