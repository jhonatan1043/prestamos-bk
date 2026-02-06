import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreatePrestamoDto } from '../application/dto/create-prestamo.dto';
import { UpdatePrestamoDto } from '../application/dto/update-prestamo.dto';
import { IPrestamoRepository } from '../domain/repositories/prestamo.repository';
import { Prestamo } from '../domain/entities/prestamo.entity';

@Injectable()
export class PrismaPrestamoRepository implements IPrestamoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCobrador(cobradorId: number): Promise<Prestamo[]> {
    // Buscar rutas donde cobradorId coincide
    const rutas = await this.prisma.ruta.findMany({
      where: { cobradorId },
      select: { id: true },
    });
    const sectorIds = rutas.map(r => r.id);
    const prestamos = await this.prisma.prestamo.findMany({
      where: {
        cliente: {
          sectorId: { in: sectorIds },
        },
      },
      include: {
        cliente: true,
        estado: true,
      },
    });
    // Mapear a entidad Prestamo
    return prestamos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      monto: typeof p.monto === 'object' && 'toNumber' in p.monto ? p.monto.toNumber() : p.monto,
      tasa: p.tasa,
      plazoDias: p.plazoDias,
      tipoPlazo: p.tipoPlazo,
      fechaInicio: p.fechaInicio,
      clienteId: p.clienteId,
      usuarioId: p.usuarioId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      tipoPrestamo: p.tipoPrestamo,
      estadoId: p.estadoId,
    }));
  }

  async create(data: Omit<import('../domain/entities/prestamo.entity').Prestamo, 'id' | 'createdAt' | 'updatedAt'>): Promise<Prestamo> {
    const payload = {
      codigo: data.codigo,
      monto: data.monto,
      tasa: data.tasa,
      plazoDias: data.plazoDias,
      tipoPlazo: data.tipoPlazo,
      fechaInicio: data.fechaInicio,
      estadoId: data.estadoId ?? 1, // Valor por defecto si no viene
      clienteId: data.clienteId,
      usuarioId: data.usuarioId,
      tipoPrestamo: data.tipoPrestamo,
    };
    const p = await this.prisma.prestamo.create({ data: payload });
    return {
      id: p.id,
      codigo: p.codigo,
      monto: typeof p.monto === 'object' && 'toNumber' in p.monto ? p.monto.toNumber() : p.monto,
      tasa: p.tasa,
      plazoDias: p.plazoDias,
      tipoPlazo: p.tipoPlazo,
      fechaInicio: p.fechaInicio,
      clienteId: p.clienteId,
      usuarioId: p.usuarioId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      tipoPrestamo: p.tipoPrestamo,
      estadoId: p.estadoId,
    };
  }

  async findAll(): Promise<Prestamo[]> {
    const prestamos = await this.prisma.prestamo.findMany({
      include: {
        cliente: true,
        estado: true
      }
    });
    return prestamos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      monto: typeof p.monto === 'object' && 'toNumber' in p.monto ? p.monto.toNumber() : p.monto,
      tasa: p.tasa,
      plazoDias: p.plazoDias,
      tipoPlazo: p.tipoPlazo,
      fechaInicio: p.fechaInicio,
      clienteId: p.clienteId,
      usuarioId: p.usuarioId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      tipoPrestamo: p.tipoPrestamo,
      estadoId: p.estadoId,
    }));
  }

  async findById(id: number): Promise<Prestamo | null> {
    const p = await this.prisma.prestamo.findUnique({
      where: { id },
      include: { cliente: true, estado: true },
    });
    if (!p) return null;
    return {
      id: p.id,
      codigo: p.codigo,
      monto: typeof p.monto === 'object' && 'toNumber' in p.monto ? p.monto.toNumber() : p.monto,
      tasa: p.tasa,
      plazoDias: p.plazoDias,
      tipoPlazo: p.tipoPlazo,
      fechaInicio: p.fechaInicio,
      clienteId: p.clienteId,
      usuarioId: p.usuarioId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      tipoPrestamo: p.tipoPrestamo,
      estadoId: p.estadoId,
    };
  }

  async update(id: number, data: import('../application/dto/update-prestamo.dto').UpdatePrestamoDto): Promise<Prestamo> {
    const p = await this.prisma.prestamo.update({
      where: { id },
      data: {
        ...data,
      },
    });
    return {
      id: p.id,
      codigo: p.codigo,
      monto: typeof p.monto === 'object' && 'toNumber' in p.monto ? p.monto.toNumber() : p.monto,
      tasa: p.tasa,
      plazoDias: p.plazoDias,
      tipoPlazo: p.tipoPlazo,
      fechaInicio: p.fechaInicio,
      clienteId: p.clienteId,
      usuarioId: p.usuarioId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      tipoPrestamo: p.tipoPrestamo,
      estadoId: p.estadoId,
    };
  }

  async delete(id: number): Promise<void> {
    // Cambiar estado del préstamo a CANCELADO (id: 2)
    await this.prisma.prestamo.update({
      where: { id },
      data: { estadoId: 2 },
    });
    // Cambiar estado de todos los pagos asociados a CANCELADO (id: 2)
    await this.prisma.pago.updateMany({
      where: { prestamoId: id },
      data: { estadoId: 2 },
    });
    return;
  }

  async findByClienteIdentificacion(identificacion: string): Promise<Prestamo[]> {
    const prestamos = await this.prisma.prestamo.findMany({
      where: {
        cliente: {
          identificacion: identificacion
        }
      },
      include: { cliente: true, estado: true }
    });
    return prestamos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      monto: typeof p.monto === 'object' && 'toNumber' in p.monto ? p.monto.toNumber() : p.monto,
      tasa: p.tasa,
      plazoDias: p.plazoDias,
      tipoPlazo: p.tipoPlazo,
      fechaInicio: p.fechaInicio,
      clienteId: p.clienteId,
      usuarioId: p.usuarioId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      tipoPrestamo: p.tipoPrestamo,
      estadoId: p.estadoId,
    }));
  }
}
