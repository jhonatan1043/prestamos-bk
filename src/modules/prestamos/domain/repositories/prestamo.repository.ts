import { Prestamo } from '../entities/prestamo.entity';
import { UpdatePrestamoDto } from '../../application/dto/update-prestamo.dto';

export interface IPrestamoRepository {
  create(data: Omit<Prestamo, 'id' | 'createdAt' | 'updatedAt'>): Promise<Prestamo>;
  findAll(): Promise<Prestamo[]>;
  findById(id: number): Promise<Prestamo | null>;
  update(id: number, data: UpdatePrestamoDto): Promise<Prestamo>;
  delete(id: number): Promise<void>;
}
