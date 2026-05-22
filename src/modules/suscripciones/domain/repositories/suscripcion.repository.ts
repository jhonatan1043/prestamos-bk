import { Suscripcion } from '../entities/suscripcion.entity';

export interface ISuscripcionRepository {
  create(data: Omit<Suscripcion, 'id' | 'createdAt' | 'updatedAt' | 'plan'>): Promise<Suscripcion>;
  findActiva(tenantId: number): Promise<Suscripcion | null>;
  findByTenant(tenantId: number): Promise<Suscripcion[]>;
  findAll(): Promise<Suscripcion[]>;
  findById(id: number): Promise<Suscripcion | null>;
  update(id: number, data: Partial<Suscripcion>): Promise<Suscripcion>;
}
