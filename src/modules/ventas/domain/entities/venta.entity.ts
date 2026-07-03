export class Venta {
  constructor(
    public id: number | null,
    public codigo: string,
    public clienteId: number,
    public usuarioId: number,
    public fechaInicio: Date,
    public totalVenta: number,
    public cuotaMonto: number,
    public numeroCuotas: number,
    public tipoPlazo: 'DIA' | 'SEMANA' | 'MES',
    public estadoId: number,
    public notas: string | null,
  ) {}
}

export class ItemVenta {
  constructor(
    public id: number | null,
    public ventaId: number,
    public productoId: number,
    public cantidad: number,
    public precioUnit: number,
    public subtotal: number,
  ) {}
}

export class CuotaVenta {
  constructor(
    public id: number | null,
    public ventaId: number,
    public numeroCuota: number,
    public fechaPago: Date,
    public monto: number,
    public estadoId: number,
    public pagadoEn: Date | null,
  ) {}
}
