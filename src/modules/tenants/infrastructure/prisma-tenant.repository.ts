import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { ITenantRepository } from '../domain/repositories/tenant.repository';
import type { Tenant, PagoTenant } from '../domain/entities/tenant.entity';

@Injectable()
export class PrismaTenantRepository implements ITenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant> {
    return this.prisma.tenant.create({ data }) as unknown as Tenant;
  }

  async findAll(): Promise<Tenant[]> {
    return this.prisma.tenant.findMany({
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    }) as unknown as Tenant[];
  }

  async findById(id: number): Promise<Tenant | null> {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: { plan: true },
    }) as unknown as Tenant | null;
  }

  async findByEmail(email: string): Promise<Tenant | null> {
    return this.prisma.tenant.findUnique({ where: { email } }) as unknown as Tenant | null;
  }

  async findBySchema(schemaName: string): Promise<Tenant | null> {
    return this.prisma.tenant.findUnique({ where: { schemaName } }) as unknown as Tenant | null;
  }

  async update(id: number, data: Partial<Tenant>): Promise<Tenant> {
    return this.prisma.tenant.update({ where: { id }, data }) as unknown as Tenant;
  }

  async delete(id: number): Promise<void> {
    await this.prisma.tenant.delete({ where: { id } });
  }

  // ─── Pagos ────────────────────────────────────────────────────────────────

  async createPago(data: Omit<PagoTenant, 'id' | 'createdAt'>): Promise<PagoTenant> {
    return this.prisma.pagoTenant.create({ data }) as unknown as PagoTenant;
  }

  async findPagosByTenant(tenantId: number): Promise<PagoTenant[]> {
    return this.prisma.pagoTenant.findMany({
      where: { tenantId },
      orderBy: { fecha: 'desc' },
    }) as unknown as PagoTenant[];
  }

  async findPagoById(id: number): Promise<PagoTenant | null> {
    return this.prisma.pagoTenant.findUnique({ where: { id } }) as unknown as PagoTenant | null;
  }
}
