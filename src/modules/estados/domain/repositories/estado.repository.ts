import { Estado } from '../entities/estado.entity';

export interface IEstadoRepository {
  findById(id: number): Promise<Estado | null>;
  findAll(): Promise<Estado[]>;
  create(data: { nombre: string }): Promise<Estado>;
}
