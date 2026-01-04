export class Gasto {
  id: number;
  descripcion: string;
  monto: number;
  fecha: Date;
  categoria: string;
  usuarioId: number; // Relaciona el gasto con un usuario

  constructor(
    id: number,
    descripcion: string,
    monto: number,
    fecha: Date,
    categoria: string,
    usuarioId: number,
  ) {
    this.id = id;
    this.descripcion = descripcion;
    this.monto = monto;
    this.fecha = fecha;
    this.categoria = categoria;
    this.usuarioId = usuarioId;
  }
}