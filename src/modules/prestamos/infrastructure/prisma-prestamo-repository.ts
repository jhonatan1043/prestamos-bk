import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { IPrestamoRepository } from '../domain/repositories/prestamo.repository';
import { Prestamo as PrismaPrestamo } from '@prisma/client';
import { Prestamo } from '../domain/entities/prestamo.entity';
import { UpdatePrestamoDto } from '../application/dto/update-prestamo.dto';

@Injectable()
export class PrismaPrestamoRepository implements IPrestamoRepository {

    async findByCobrador(cobradorId: number): Promise<Prestamo[]> {
      // Buscar rutas donde cobradorId coincide
      const rutas = await this.prisma.ruta.findMany({
        where: { cobradorId },
        select: { id: true },
      });
      const sectorIds = rutas.map(r => r.id);
      const found = await this.prisma.prestamo.findMany({
        where: {
          cliente: {
            sectorId: { in: sectorIds },
          },
        },
      });
      return found.map(this.toDomain);
    }
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Omit<Prestamo, 'id' | 'createdAt' | 'updatedAt'>): Promise<Prestamo> {
    const created = await this.prisma.prestamo.create({
      data: {
        codigo: data.codigo,
        monto: data.monto,
        tasa: data.tasa,
        plazoDias: data.plazoDias,
        tipoPlazo: data.tipoPlazo,
        fechaInicio: typeof data.fechaInicio === 'string' ? new Date(data.fechaInicio) : data.fechaInicio,
        tipoPrestamo: data.tipoPrestamo,
        estadoId: data.estadoId!,
        clienteId: data.clienteId,
        usuarioId: data.usuarioId,
      } as any,
    });
    return this.toDomain(created);
  }

  async findAll(): Promise<Prestamo[]> {
    const found = await this.prisma.prestamo.findMany();
    return found.map(this.toDomain);
  }

  async findById(id: number): Promise<Prestamo | null> {
    const found = await this.prisma.prestamo.findUnique({ where: { id } });
    return found ? this.toDomain(found) : null;
  }

  async update(id: number, data: import('../application/dto/update-prestamo.dto').UpdatePrestamoDto): Promise<Prestamo> {
    const updateData: any = { ...data };
    if (updateData.fechaInicio && typeof updateData.fechaInicio === 'string') {
      updateData.fechaInicio = new Date(updateData.fechaInicio);
    }
    const updated = await this.prisma.prestamo.update({ where: { id }, data: updateData });
    return this.toDomain(updated);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.prestamo.delete({ where: { id } });
  }

  async findByClienteIdentificacion(identificacion: string): Promise<Prestamo[]> {
    const found = await this.prisma.prestamo.findMany({
      where: {
        cliente: {
          identificacion,
        },
      },
    });
    return found.map(this.toDomain);
  }

  private toDomain(prisma: PrismaPrestamo): Prestamo {
    return {
      id: prisma.id,
      codigo: prisma.codigo,
      monto: Number(prisma.monto),
      tasa: prisma.tasa,
      plazoDias: prisma.plazoDias,
      tipoPlazo: prisma.tipoPlazo as 'DIA' | 'SEMANA' | 'MES',
      fechaInicio: prisma.fechaInicio,
      clienteId: prisma.clienteId,
      usuarioId: prisma.usuarioId,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
      tipoPrestamo: prisma.tipoPrestamo as 'FIJO' | 'SOBRE_SALDO',
      estadoId: prisma.estadoId,
    };
  }
}
