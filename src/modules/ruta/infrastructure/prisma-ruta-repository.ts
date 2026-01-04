import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { IRutaRepository } from '../domain/repositories/ruta.repository';
import { Ruta } from '../domain/entities/ruta.entity';

@Injectable()
export class PrismaRutaRepository implements IRutaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Ruta[]> {
    const rutas = await this.prisma.ruta.findMany();
    return rutas.map(r => {
      const ruta = new Ruta();
      ruta.id = r.id;
      ruta.nombre = r.nombre;
      ruta.sector = r.sector;
      ruta.cobradorId = r.cobradorId;
      return ruta;
    });
  }

  async create(ruta: Ruta): Promise<Ruta> {
    const created = await this.prisma.ruta.create({
      data: {
        nombre: ruta.nombre,
        sector: ruta.sector,
        cobradorId: ruta.cobradorId,
      },
    });
    const nuevaRuta = new Ruta();
    nuevaRuta.id = created.id;
    nuevaRuta.nombre = created.nombre;
    nuevaRuta.sector = created.sector;
    nuevaRuta.cobradorId = created.cobradorId;
    return nuevaRuta;
  }
}
