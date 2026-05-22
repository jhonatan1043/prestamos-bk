import type { Tenant, PagoTenant } from '../entities/tenant.entity';

export interface ITenantRepository {
  create(data: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant>;
  findAll(): Promise<Tenant[]>;
  findById(id: number): Promise<Tenant | null>;
  findByEmail(email: string): Promise<Tenant | null>;
  findBySchema(schemaName: string): Promise<Tenant | null>;
  update(id: number, data: Partial<Tenant>): Promise<Tenant>;
  delete(id: number): Promise<void>;

  // Pagos
  createPago(data: Omit<PagoTenant, 'id' | 'createdAt'>): Promise<PagoTenant>;
  findPagosByTenant(tenantId: number): Promise<PagoTenant[]>;
  findPagoById(id: number): Promise<PagoTenant | null>;
}
