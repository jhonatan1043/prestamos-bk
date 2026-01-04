import { Gasto } from '../entities/gasto.entity';

export interface IGastoRepository {
  create(data: Omit<Gasto, 'id'>): Promise<Gasto>;
  findAll(): Promise<Gasto[]>;
  findById(id: number): Promise<Gasto | null>;
  update(id: number, data: Partial<Gasto>): Promise<Gasto>;
  remove(id: number): Promise<void>;
}
