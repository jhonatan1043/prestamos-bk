export class Prestamo {
  id: number;
  codigo: string;
  monto: number;
  tasa: number;
  plazoDias: number;
  fechaInicio: Date;
  estado: string;
  clienteId: number;
  createdAt?: Date;
  updatedAt?: Date;
}
