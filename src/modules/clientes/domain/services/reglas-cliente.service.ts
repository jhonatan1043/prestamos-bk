import { Cliente } from '../entities/cliente.entity';

export class ReglasClienteService {
  static esMayorDeEdad(cliente: Cliente): boolean {
    if (!cliente.fechaNacimiento) return false;
    const hoy = new Date();
    const nacimiento = new Date(cliente.fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad >= 18;
  }
}
