import { Ruta } from '../entities/ruta.entity';

export interface IRutaRepository {
  findAll(): Promise<Ruta[]>;
  create(ruta: Ruta): Promise<Ruta>;
}
