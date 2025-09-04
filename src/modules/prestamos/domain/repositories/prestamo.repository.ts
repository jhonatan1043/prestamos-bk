import { Prestamo } from '../entities/prestamo.entity';

export interface IPrestamoRepository {
  create(data: Omit<Prestamo, 'id' | 'createdAt' | 'updatedAt'>): Promise<Prestamo>;
  findAll(): Promise<Prestamo[]>;
  findById(id: number): Promise<Prestamo | null>;
  update(id: number, data: Partial<Prestamo>): Promise<Prestamo>;
  delete(id: number): Promise<void>;
}
