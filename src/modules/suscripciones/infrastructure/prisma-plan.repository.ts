import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { IPlanRepository } from '../domain/repositories/plan.repository';
import { Plan } from '../domain/entities/plan.entity';

@Injectable()
export class PrismaPlanRepository implements IPlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>): Promise<Plan> {
    const created = await this.prisma.plan.create({ data: { ...data, precio: data.precio } });
    return this.toEntity(created);
  }

  async findAll(): Promise<Plan[]> {
    const plans = await this.prisma.plan.findMany({ orderBy: { precio: 'asc' } });
    return plans.map(this.toEntity);
  }

  async findActivos(): Promise<Plan[]> {
    const plans = await this.prisma.plan.findMany({ where: { activo: true }, orderBy: { precio: 'asc' } });
    return plans.map(this.toEntity);
  }

  async findById(id: number): Promise<Plan | null> {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    return plan ? this.toEntity(plan) : null;
  }

  async update(id: number, data: Partial<Plan>): Promise<Plan> {
    const updated = await this.prisma.plan.update({ where: { id }, data: data as any });
    return this.toEntity(updated);
  }

  async remove(id: number): Promise<void> {
    await this.prisma.plan.update({ where: { id }, data: { activo: false } });
  }

  private toEntity(p: any): Plan {
    return {
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion ?? undefined,
      maxUsuarios: p.maxUsuarios,
      maxClientes: p.maxClientes,
      maxPrestamosPorCliente: p.maxPrestamosPorCliente,
      precio: Number(p.precio),
      activo: p.activo,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}
