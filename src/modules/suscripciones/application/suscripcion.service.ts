import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { TenantContextService } from '../../../common/tenant/tenant-context.service';
import type { ISuscripcionRepository } from '../domain/repositories/suscripcion.repository';
import type { IPlanRepository } from '../domain/repositories/plan.repository';
import { CreateSuscripcionDto } from './dto/create-suscripcion.dto';

@Injectable()
export class SuscripcionService {
  constructor(
    @Inject('ISuscripcionRepository')
    private readonly suscripcionRepository: ISuscripcionRepository,
    @Inject('IPlanRepository')
    private readonly planRepository: IPlanRepository,
    private readonly tenantCtx: TenantContextService,
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
}
