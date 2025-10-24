import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreatePrestamoDto } from '../application/dto/create-prestamo.dto';
import { UpdatePrestamoDto } from '../application/dto/update-prestamo.dto';

@Injectable()
export class PrismaPrestamoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePrestamoDto) {
    // DEBUG: log para ver el tipo y valor recibido
    console.log('DEBUG usuarioId:', data.usuarioId, typeof data.usuarioId);
    console.log('DEBUG clienteId:', data.clienteId, typeof data.clienteId);
    const usuarioId = typeof data.usuarioId === 'string' ? parseInt(data.usuarioId, 10) : data.usuarioId;
    const clienteId = typeof data.clienteId === 'string' ? parseInt(data.clienteId, 10) : data.clienteId;
    if (isNaN(usuarioId) || isNaN(clienteId)) {
      throw new Error('usuarioId y clienteId deben ser números válidos');
    }
    // Solo enviar los campos primitivos requeridos por Prisma
    const payload = {
      codigo: data.codigo,
      monto: data.monto,
      tasa: data.tasa,
      plazoDias: data.plazoDias,
      tipoPlazo: data.tipoPlazo,
      fechaInicio: data.fechaInicio,
      estadoId: data.estadoId,
      clienteId,
      usuarioId,
    };
    return this.prisma.prestamo.create({ data: payload });
  }

  async findAll() {
  return this.prisma.prestamo.findMany({ include: { cliente: true, estado: true } });
  }

  async findById(id: number) {
    return this.prisma.prestamo.findUnique({
      where: { id },
      include: { cliente: true, estado: true },
    });
  }

  async update(id: number, data: UpdatePrestamoDto) {
    return this.prisma.prestamo.update({
      where: { id },
      data: {
        ...data,
      },
    });
  }

  async delete(id: number) {
    return this.prisma.prestamo.delete({ where: { id } });
  }

  async findByClienteIdentificacion(identificacion: string) {
    return this.prisma.prestamo.findMany({
      where: {
        cliente: {
          identificacion: identificacion
        }
      },
      include: { cliente: true, estado: true }
    });
  }
}
