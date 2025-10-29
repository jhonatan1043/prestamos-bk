import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateRutaDto } from './dto/create-ruta.dto';

@Injectable()
export class RutaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRutaDto) {
    // Buscar clientes por sector
    const clientes = await this.prisma.cliente.findMany({
      where: { direccion: { contains: dto.sector } }
    });
    return this.prisma.ruta.create({
      data: {
        nombre: dto.nombre,
        sector: dto.sector,
        cobradorId: dto.cobradorId,
        clientes: { connect: clientes.map(c => ({ id: c.id })) }
      }
    });
  }

  async findAll() {
    return this.prisma.ruta.findMany({ include: { clientes: true, cobrador: true } });
  }
}
