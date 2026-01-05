import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { IGastoRepository } from '../domain/repositories/gasto.repository';
import { Gasto } from '../domain/entities/gasto.entity';

@Injectable()
export class PrismaGastoRepository implements IGastoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Gasto[]> {
    const gastos = await this.prisma.gasto.findMany();
    return gastos.map(g => new Gasto(
      g.id,
      g.descripcion,
      Number(g.monto),
      g.fecha,
      g.categoria,
      g.usuarioId,
    ));
  }

  async findById(id: number): Promise<Gasto | null> {
    const g = await this.prisma.gasto.findUnique({ where: { id } });
    if (!g) return null;
    return new Gasto(
      g.id,
      g.descripcion,
      Number(g.monto),
      g.fecha,
      g.categoria,
      g.usuarioId,
    );
  }

  async create(gasto: Gasto): Promise<Gasto> {
    const created = await this.prisma.gasto.create({
      data: {
        descripcion: gasto.descripcion,
        monto: gasto.monto,
        fecha: gasto.fecha,
        categoria: gasto.categoria,
        usuarioId: gasto.usuarioId,
      },
    });
    return new Gasto(
      created.id,
      created.descripcion,
      Number(created.monto),
      created.fecha,
      created.categoria,
      created.usuarioId,
    );
  }

  async update(id: number, data: Partial<Gasto>): Promise<Gasto> {
    const updated = await this.prisma.gasto.update({
      where: { id },
      data: {
        descripcion: data.descripcion,
        monto: data.monto,
        fecha: data.fecha,
        categoria: data.categoria,
        usuarioId: data.usuarioId,
      },
    });
    return new Gasto(
      updated.id,
      updated.descripcion,
      Number(updated.monto),
      updated.fecha,
      updated.categoria,
      updated.usuarioId,
    );
  }

  async remove(id: number): Promise<void> {
    await this.prisma.gasto.delete({ where: { id } });
  }
}