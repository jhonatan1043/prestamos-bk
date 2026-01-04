import { Cobrador } from '../entities/cobrador.entity';

export interface ICobradorRepository {
  findAll(): Promise<Cobrador[]>;
  create(cobrador: Cobrador): Promise<Cobrador>;
}
