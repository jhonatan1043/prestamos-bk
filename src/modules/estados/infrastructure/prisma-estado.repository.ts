import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/tenant/tenant-prisma.service';
import { Estado } from '../domain/entities/estado.entity';
import { IEstadoRepository } from '../domain/repositories/estado.repository';

@Injectable()
export class PrismaEstadoRepository implements IEstadoRepository {
  async create(data: { nombre: string }): Promise<Estado> {
    return this.prisma.estado.create({ data });
  }
  constructor(private readonly prisma: TenantPrismaService) {}

  async findById(id: number): Promise<Estado | null> {
    return this.prisma.estado.findUnique({ where: { id } });
  }

  async findAll(): Promise<Estado[]> {
    return this.prisma.estado.findMany();
  }
}
