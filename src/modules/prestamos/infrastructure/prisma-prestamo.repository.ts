import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreatePrestamoDto } from '../application/dto/create-prestamo.dto';
import { UpdatePrestamoDto } from '../application/dto/update-prestamo.dto';

@Injectable()
export class PrismaPrestamoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePrestamoDto) {
  return this.prisma.prestamo.create({ data }); // usuarioId ya estará incluido en data
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
