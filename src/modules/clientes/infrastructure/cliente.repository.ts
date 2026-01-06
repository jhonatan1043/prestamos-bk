import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { IClienteRepository } from '../domain/repositories/cliente.repository';
import { Cliente } from '../domain/entities/cliente.entity';

@Injectable()
export class PrismaClienteRepository implements IClienteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(cliente: Cliente): Promise<Cliente> {
    const created = await this.prisma.cliente.create({
      data: {
        tipoIdentificacion: cliente.tipoIdentificacion,
        identificacion: cliente.identificacion,
        nombres: cliente.nombres,
        apellidos: cliente.apellidos,
        edad: cliente.edad,
        direccion: cliente.direccion,
        telefono: cliente.telefono,
        sectorId: cliente.sectorId,
      },
    });
    return new Cliente(
      created.id,
      created.tipoIdentificacion,
      created.identificacion,
      created.nombres,
      created.apellidos,
      created.direccion,
      created.telefono,
      created.sectorId,
      created.edad === null ? undefined : created.edad
    );
  }

  async findAll(): Promise<Cliente[]> {
    const clientes = await this.prisma.cliente.findMany({ where: { active: true } });
    return clientes.map(
      (c) =>
        new Cliente(
          c.id,
          c.tipoIdentificacion,
          c.identificacion,
          c.nombres,
          c.apellidos,
          c.direccion,
          c.telefono,
          c.sectorId,
          c.edad === null ? undefined : c.edad
        ),
    );
  }

  async findById(id: number): Promise<Cliente | null> {
    const c = await this.prisma.cliente.findUnique({ where: { id } });
    if (!c) return null;
    return new Cliente(
      c.id,
      c.tipoIdentificacion,
      c.identificacion,
      c.nombres,
      c.apellidos,
      c.direccion,
      c.telefono,
      c.sectorId,
      c.edad === null ? undefined : c.edad
    );
  }

  async update(cliente: Cliente): Promise<Cliente> {
    const updated = await this.prisma.cliente.update({
      where: { id: cliente.id ?? 0 },
      data: {
        tipoIdentificacion: cliente.tipoIdentificacion,
        identificacion: cliente.identificacion,
        nombres: cliente.nombres,
        apellidos: cliente.apellidos,
        edad: cliente.edad,
        direccion: cliente.direccion,
        telefono: cliente.telefono,
        sectorId: cliente.sectorId,
      },
    });
    return new Cliente(
      updated.id,
      updated.tipoIdentificacion,
      updated.identificacion,
      updated.nombres,
      updated.apellidos,
      updated.direccion,
      updated.telefono,
      updated.sectorId,
      updated.edad === null ? undefined : updated.edad
    );
  }

  async remove(id: number): Promise<void> {
    await this.prisma.cliente.update({ where: { id }, data: { active: false } });
  }
}
