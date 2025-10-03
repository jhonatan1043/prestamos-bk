import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreatePrestamoDto } from '../application/dto/create-prestamo.dto';
import { UpdatePrestamoDto } from '../application/dto/update-prestamo.dto';

@Injectable()
export class PrismaPrestamoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePrestamoDto) {
    // Validar que usuarioId y clienteId existan y sean números
    if (typeof data.usuarioId !== 'number' || typeof data.clienteId !== 'number') {
      throw new Error('usuarioId y clienteId deben ser números válidos');
    }
    // Solo enviar los campos primitivos requeridos por Prisma
    const payload = {
      codigo: data.codigo,
      monto: data.monto,
      tasa: data.tasa,
      plazoDias: data.plazoDias,
      fechaInicio: data.fechaInicio,
      estado: data.estado,
      clienteId: data.clienteId,
      usuarioId: data.usuarioId,
    };
    return this.prisma.prestamo.create({ data: payload });
  }

  async findAll() {
    return this.prisma.prestamo.findMany({ include: { cliente: true } });
  }

  async findById(id: number) {
    return this.prisma.prestamo.findUnique({
      where: { id },
      include: { cliente: true },
    });
  }

  async update(id: number, data: UpdatePrestamoDto) {
    return this.prisma.prestamo.update({ where: { id }, data });
  }

  async delete(id: number) {
    return this.prisma.prestamo.delete({ where: { id } });
  }
}
