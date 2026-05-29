import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IPlanRepository } from '../domain/repositories/plan.repository';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlanService {
  constructor(
    @Inject('IPlanRepository')
    private readonly planRepository: IPlanRepository,
  ) {}

  async create(dto: CreatePlanDto) {
    return this.planRepository.create({
      ...dto,
      duracionDias: dto.duracionDias ?? 30,
      activo:       dto.activo ?? true,
    });
  }

  async findAll() {
    return this.planRepository.findAll();
  }

  async findActivos() {
    return this.planRepository.findActivos();
  }

  async findById(id: number) {
    const plan = await this.planRepository.findById(id);
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return plan;
  }

  async update(id: number, dto: UpdatePlanDto) {
    await this.findById(id);
    return this.planRepository.update(id, dto);
  }

  async remove(id: number) {
    await this.findById(id);
    return this.planRepository.remove(id);
  }
}
