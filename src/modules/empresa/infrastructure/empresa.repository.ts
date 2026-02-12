import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { Empresa } from '../domain/entities/empresa.entity';
import { IEmpresaRepository } from '../domain/repositories/empresa.repository';

@Injectable()
export class PrismaEmpresaRepository implements IEmpresaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresa: Empresa): Promise<Empresa> {
    const created = await this.prisma.empresa.create({
      data: {
        nombre: empresa.nombre,
        ruc: empresa.ruc,
        direccion: empresa.direccion,
        telefono: empresa.telefono,
        correo: empresa.correo,
        logoUrl: empresa.logoUrl,
        divisa: empresa.divisa,
        codigoPais: empresa.codigoPais,
      },
    });
    return this.toDomain(created);
  }

  async findAll(): Promise<Empresa[]> {
    const empresas = await this.prisma.empresa.findMany();
    return empresas.map(this.toDomain);
  }

  async findById(id: number): Promise<Empresa | null> {
    const empresa = await this.prisma.empresa.findUnique({ where: { id } });
    return empresa ? this.toDomain(empresa) : null;
  }

  async update(empresa: Empresa): Promise<Empresa> {
    const updated = await this.prisma.empresa.update({
      where: { id: empresa.id },
      data: {
        nombre: empresa.nombre,
        ruc: empresa.ruc,
        direccion: empresa.direccion,
        telefono: empresa.telefono,
        correo: empresa.correo,
        logoUrl: empresa.logoUrl,
        divisa: empresa.divisa,
        codigoPais: empresa.codigoPais,
      },
    });
    return this.toDomain(updated);
  }

  async remove(id: number): Promise<void> {
    await this.prisma.empresa.delete({ where: { id } });
  }

  private toDomain(e: any): Empresa {
    return {
      id: e.id,
      nombre: e.nombre,
      ruc: e.ruc,
      direccion: e.direccion,
      telefono: e.telefono,
      correo: e.correo,
      logoUrl: e.logoUrl,
      divisa: e.divisa,
      codigoPais: e.codigoPais,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }
}
