import { Prestamo } from '../entities/prestamo.entity';
import { UpdatePrestamoDto } from '../../application/dto/update-prestamo.dto';

export interface IPrestamoRepository {
  findByEstados(estadoIds: number[]): Promise<Prestamo[]>;
  findByEstadosYCobrador(estadoIds: number[], cobradorId: number): Promise<Prestamo[]>;
  create(data: Omit<Prestamo, 'id' | 'createdAt' | 'updatedAt'>): Promise<Prestamo>;
  findAll(): Promise<Prestamo[]>;
  findById(id: number): Promise<Prestamo | null>;
  update(id: number, data: import('../../application/dto/update-prestamo.dto').UpdatePrestamoDto): Promise<Prestamo>;
  delete(id: number): Promise<void>;

  findByClienteIdentificacion(identificacion: string): Promise<Prestamo[]>;
  findByCobrador(cobradorId: number): Promise<Prestamo[]>;
}
