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
        prestamoId: data.prestamoId,
        fecha: typeof data.fecha === 'string' ? new Date(data.fecha) : data.fecha,
        monto: data.monto,
        estadoId: data.estadoId,
      },
    });
    return result as Pago;
  }

  async findAll(): Promise<Pago[]> {
  const results = await this.prisma.pago.findMany();
  return results as Pago[];
  }

  async findById(id: number): Promise<Pago | null> {
  const pago = await this.prisma.pago.findUnique({ where: { id } });
  if (!pago) return null;
  return pago as Pago;
  }

  async update(id: number, data: Partial<Pago>): Promise<Pago> {
    const updateData: any = { ...data };
    if (data.estadoId) {
      updateData.estadoId = data.estadoId;
    }
    const result = await this.prisma.pago.update({
      where: { id },
      data: updateData,
    });
    return result as Pago;
  }

  async delete(id: number): Promise<void> {
  // Para anular el pago, deberías cambiar el estadoId al id correspondiente a "ELIMINADO" en la tabla Estado
  // await this.prisma.pago.update({ where: { id }, data: { estado: { connect: { id: idEstadoEliminado } } } });
  }
}
