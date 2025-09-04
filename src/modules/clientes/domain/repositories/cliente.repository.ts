import { Cliente } from '../entities/cliente.entity';

export interface IClienteRepository {
  create(cliente: Cliente): Promise<Cliente>;
  findAll(): Promise<Cliente[]>;
  findById(id: number): Promise<Cliente | null>;
  update(cliente: Cliente): Promise<Cliente>;
  remove(id: number): Promise<void>;
}
