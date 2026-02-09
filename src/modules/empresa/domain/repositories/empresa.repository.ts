import { Empresa } from '../entities/empresa.entity';

export interface IEmpresaRepository {
  create(empresa: Empresa): Promise<Empresa>;
  findAll(): Promise<Empresa[]>;
  findById(id: number): Promise<Empresa | null>;
  update(empresa: Empresa): Promise<Empresa>;
  remove(id: number): Promise<void>;
}
