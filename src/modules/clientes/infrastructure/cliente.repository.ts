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
      created.edad ?? undefined,
    );
  }

  async findAll(): Promise<Cliente[]> {
    const clientes = await this.prisma.cliente.findMany();
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
          c.edad ?? undefined,
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
      c.edad ?? undefined,
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
        
      },
    });
    return new Cliente(
      updated.id,
      updated.tipoIdentificacion,
      updated.identificacion,
      updated.nombres,
      updated.apellidos,
      cliente.direccion,
      cliente.telefono,
      updated.edad ?? undefined,
    );
  }

  async remove(id: number): Promise<void> {
    await this.prisma.cliente.delete({ where: { id } });
  }
}
