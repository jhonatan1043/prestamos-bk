import { Cliente } from '../entities/cliente.entity';

export class ReglasClienteService {
  static esMayorDeEdad(cliente: Cliente): boolean {
    return (cliente.edad ?? 0) >= 18;
  }
}
