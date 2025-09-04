import { Pago } from '../entities/pago.entity';

export interface IPagoRepository {
  create(data: Omit<Pago, 'id'>): Promise<Pago>;
  findAll(): Promise<Pago[]>;
  findById(id: number): Promise<Pago | null>;
  update(id: number, data: Partial<Pago>): Promise<Pago>;
  delete(id: number): Promise<void>;
}
