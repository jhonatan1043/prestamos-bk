import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { ICobradorRepository } from '../domain/repositories/cobrador.repository';
import { Cobrador } from '../domain/entities/cobrador.entity';

@Injectable()
export class PrismaCobradorRepository implements ICobradorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Cobrador[]> {
    const cobradores = await this.prisma.cobrador.findMany();
    return cobradores.map(c => new Cobrador(c.id, c.usuarioId));
  }

  async create(cobrador: Cobrador): Promise<Cobrador> {
    const created = await this.prisma.cobrador.create({
      data: {
        usuarioId: cobrador.usuarioId,
      },
    });
    return new Cobrador(created.id, created.usuarioId);
  }
}
