import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { IPagoRepository } from '../domain/repositories/pago.repository';
import { Pago } from '../domain/entities/pago.entity';

@Injectable()
export class PrismaPagoRepository implements IPagoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Omit<Pago, 'id'>): Promise<Pago> {
    return this.prisma.pago.create({ data });
  }

  async findAll(): Promise<Pago[]> {
    return this.prisma.pago.findMany();
  }

  async findById(id: number): Promise<Pago | null> {
    return this.prisma.pago.findUnique({ where: { id } });
  }

  async update(id: number, data: Partial<Pago>): Promise<Pago> {
    return this.prisma.pago.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.pago.delete({ where: { id } });
  }
}
