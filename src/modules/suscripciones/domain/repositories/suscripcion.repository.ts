import { Suscripcion } from '../entities/suscripcion.entity';

export interface ISuscripcionRepository {
  create(data: Omit<Suscripcion, 'id' | 'createdAt' | 'updatedAt' | 'plan'>): Promise<Suscripcion>;
  findActiva(): Promise<Suscripcion | null>;
  findAll(): Promise<Suscripcion[]>;
  findById(id: number): Promise<Suscripcion | null>;
  update(id: number, data: Partial<Suscripcion>): Promise<Suscripcion>;
}
