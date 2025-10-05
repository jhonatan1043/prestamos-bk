import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { IPagoRepository } from '../domain/repositories/pago.repository';
import { Prisma } from '@prisma/client';
import { Pago } from '../domain/entities/pago.entity';

@Injectable()
export class PrismaPagoRepository implements IPagoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Omit<Pago, 'id'>): Promise<Pago> {
    const result = await this.prisma.pago.create({
      data: {
        ...data,
        fecha: typeof data.fecha === 'string' ? new Date(data.fecha) : data.fecha,
        estado: data.estado ?? 'ACTIVO',
      }
    });
    return { ...result };
  }

  async findAll(): Promise<Pago[]> {
    const results = await this.prisma.pago.findMany({ where: { estado: 'ACTIVO' } });
    return results.map(p => ({ ...p }));
  }

  async findById(id: number): Promise<Pago | null> {
    const pago = await this.prisma.pago.findUnique({ where: { id } });
    if (!pago || pago.estado !== 'ACTIVO') return null;
    return { ...pago };
  }

  async update(id: number, data: Partial<Pago>): Promise<Pago> {
    const result = await this.prisma.pago.update({
      where: { id },
      data,
    });
    return { ...result };
  }

  async delete(id: number): Promise<void> {
    await this.prisma.pago.update({ where: { id }, data: { estado: 'ELIMINADO' } });
  }
}
