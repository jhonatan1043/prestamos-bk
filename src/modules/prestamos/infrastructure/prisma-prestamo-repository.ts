import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/tenant/tenant-prisma.service';
import { IPrestamoRepository } from '../domain/repositories/prestamo.repository';
import { Prestamo as PrismaPrestamo } from '@prisma/client';
import { Prestamo } from '../domain/entities/prestamo.entity';
import { Cliente } from '../../clientes/domain/entities/cliente.entity';
import { UpdatePrestamoDto } from '../application/dto/update-prestamo.dto';

@Injectable()
export class PrismaPrestamoRepository implements IPrestamoRepository {
  constructor(private readonly prisma: TenantPrismaService) {}

  async create(data: Omit<Prestamo, 'id' | 'createdAt' | 'updatedAt' | 'codigo'>): Promise<Prestamo> {
    const last = await this.prisma.prestamo.findFirst({
      orderBy: { id: 'desc' },
      select: { codigo: true },
    });

    let nextNumber = 1;
    if (last?.codigo) {
      const match = last.codigo.match(/PRE-(\d+)/);
      if (match) nextNumber = parseInt(match[1], 10) + 1;
    }
    const nextCodigo = `PRE-${nextNumber.toString().padStart(13, '0')}`;

    const created = await this.prisma.prestamo.create({
      data: { ...(data as any), codigo: nextCodigo },
    });
    return this.toDomain(created);
  }

  async findAll(): Promise<Prestamo[]> {
    const found = await this.prisma.prestamo.findMany({ include: { cliente: true } });
    return found.map(item => this.toDomainWithCliente(item));
  }

  async findById(id: number): Promise<Prestamo | null> {
    const found = await this.prisma.prestamo.findUnique({ where: { id }, include: { cliente: true } });
    return found ? this.toDomainWithCliente(found) : null;
  }

  async findByEstados(estadoIds: number[]): Promise<Prestamo[]> {
    const found = await this.prisma.prestamo.findMany({
      where: { estadoId: { in: estadoIds } },
      include: { cliente: true },
    });
    return found.map(item => this.toDomainWithCliente(item));
  }

  async findByEstadosYCobrador(estadoIds: number[], cobradorId: number): Promise<Prestamo[]> {
    const rutas = await this.prisma.ruta.findMany({
      where: { cobradorId },
      select: { id: true },
    });
    const sectorIds = rutas.map(r => r.id);
    const found = await this.prisma.prestamo.findMany({
      where: {
        estadoId: { in: estadoIds },
        cliente: { sectorId: { in: sectorIds } },
      },
      include: { cliente: true },
    });
    return found.map(item => this.toDomainWithCliente(item));
  }

  async findByCobrador(cobradorId: number): Promise<Prestamo[]> {
    const rutas = await this.prisma.ruta.findMany({
      where: { cobradorId },
      select: { id: true },
    });
    const sectorIds = rutas.map(r => r.id);
    const found = await this.prisma.prestamo.findMany({
      where: { cliente: { sectorId: { in: sectorIds } } },
      include: { cliente: true },
    });
    return found.map(item => this.toDomainWithCliente(item));
  }

  async findByClienteIdentificacion(identificacion: string): Promise<Prestamo[]> {
    const found = await this.prisma.prestamo.findMany({
      where: { cliente: { identificacion } },
      include: { cliente: true },
    });
    return found.map(item => this.toDomainWithCliente(item));
  }

  async update(id: number, data: UpdatePrestamoDto): Promise<Prestamo> {
    const updateData: any = { ...data };
    if (typeof updateData.fechaInicio === 'string') {
      updateData.fechaInicio = new Date(updateData.fechaInicio);
    }
    const updated = await this.prisma.prestamo.update({ where: { id }, data: updateData });
    return this.toDomain(updated);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.prestamo.delete({ where: { id } });
  }

  // ─── Mappers ──────────────────────────────────────────────────────────────

  private toDomain(p: PrismaPrestamo): Prestamo {
    return {
      id: p.id,
      codigo: p.codigo,
      monto: Number(p.monto),
      tasa: p.tasa,
      plazoDias: p.plazoDias,
      tipoPlazo: p.tipoPlazo as 'DIA' | 'SEMANA' | 'MES',
      fechaInicio: p.fechaInicio,
      clienteId: p.clienteId,
      usuarioId: p.usuarioId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      tipoPrestamo: p.tipoPrestamo as 'FIJO' | 'SOBRE_SALDO',
      estadoId: p.estadoId,
    };
  }

  private toDomainWithCliente(p: PrismaPrestamo & { cliente?: any }): Prestamo {
    const base = this.toDomain(p);
    if (!p.cliente) return base;
    return {
      ...base,
      cliente: new Cliente(
        p.cliente.id,
        p.cliente.tipoIdentificacion,
        p.cliente.identificacion,
        p.cliente.nombres,
        p.cliente.apellidos,
        p.cliente.direccion,
        p.cliente.telefono,
        p.cliente.sectorId,
        p.cliente.correo,
        p.cliente.usuarioId,
        p.cliente.fechaNacimiento,
        p.cliente.active,
      ),
    };
  }
}
