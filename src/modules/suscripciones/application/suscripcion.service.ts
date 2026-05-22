import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
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
  ) {}

  async activar(dto: CreateSuscripcionDto) {
    // Verificar que el plan exista y esté activo
    const plan = await this.planRepository.findById(dto.planId);
    if (!plan) throw new NotFoundException('Plan no encontrado');
    if (!plan.activo) throw new ConflictException('El plan seleccionado no está activo');

    // Cancelar cualquier suscripción activa anterior
    const actual = await this.suscripcionRepository.findActiva();
    if (actual) {
      await this.suscripcionRepository.update(actual.id, { estado: 'CANCELADA' });
    }

    return this.suscripcionRepository.create({
      planId: dto.planId,
      fechaInicio: new Date(dto.fechaInicio),
      fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : undefined,
      estado: 'ACTIVA',
    });
  }

  async findActiva() {
    const suscripcion = await this.suscripcionRepository.findActiva();
    if (!suscripcion) throw new NotFoundException('No hay suscripción activa');
    return suscripcion;
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
