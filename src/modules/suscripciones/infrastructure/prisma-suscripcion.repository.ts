import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { ISuscripcionRepository } from '../domain/repositories/suscripcion.repository';
import { Suscripcion } from '../domain/entities/suscripcion.entity';

@Injectable()
export class PrismaSuscripcionRepository implements ISuscripcionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Omit<Suscripcion, 'id' | 'createdAt' | 'updatedAt' | 'plan'>): Promise<Suscripcion> {
    const created = await this.prisma.suscripcion.create({
      data: {
        planId: data.planId,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
        estado: data.estado,
      },
      include: { plan: true },
    });
    return this.toEntity(created);
  }

  async findActiva(): Promise<Suscripcion | null> {
    const found = await this.prisma.suscripcion.findFirst({
      where: { estado: 'ACTIVA' },
      orderBy: { fechaInicio: 'desc' },
      include: { plan: true },
    });
    return found ? this.toEntity(found) : null;
  }

  async findAll(): Promise<Suscripcion[]> {
    const all = await this.prisma.suscripcion.findMany({
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });
    return all.map(this.toEntity);
  }

  async findById(id: number): Promise<Suscripcion | null> {
    const found = await this.prisma.suscripcion.findUnique({ where: { id }, include: { plan: true } });
    return found ? this.toEntity(found) : null;
  }

  async update(id: number, data: Partial<Suscripcion>): Promise<Suscripcion> {
    const updated = await this.prisma.suscripcion.update({
      where: { id },
      data: data as any,
      include: { plan: true },
    });
    return this.toEntity(updated);
  }

  private toEntity(s: any): Suscripcion {
    return {
      id: s.id,
      planId: s.planId,
      fechaInicio: s.fechaInicio,
      fechaFin: s.fechaFin ?? undefined,
      estado: s.estado,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      plan: s.plan
        ? {
            id: s.plan.id,
            nombre: s.plan.nombre,
            descripcion: s.plan.descripcion ?? undefined,
            maxUsuarios: s.plan.maxUsuarios,
            maxClientes: s.plan.maxClientes,
            maxPrestamosPorCliente: s.plan.maxPrestamosPorCliente,
            precio: Number(s.plan.precio),
            activo: s.plan.activo,
            createdAt: s.plan.createdAt,
            updatedAt: s.plan.updatedAt,
          }
        : undefined,
    };
  }
}
