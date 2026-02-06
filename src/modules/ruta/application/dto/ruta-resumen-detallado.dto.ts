import { ApiProperty } from '@nestjs/swagger';

export class PrestamoDetalleDto {
  @ApiProperty()
  prestamoId: number;

  @ApiProperty()
  monto: number;

  @ApiProperty()
  tasa: number;

  @ApiProperty()
  valorAPagar: number;

  @ApiProperty()
  saldoRestante: number;
}

export class ClienteDetalleDto {
  @ApiProperty()
  clienteId: number;

  @ApiProperty()
  nombres: string;

  @ApiProperty()
  apellidos: string;

  @ApiProperty({ type: [PrestamoDetalleDto] })
  prestamos: PrestamoDetalleDto[];
}

export class RutaResumenDetalladoDto {
  @ApiProperty()
  rutaId: number;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  sector: string;

  @ApiProperty()
  cobradorId: number;

  @ApiProperty()
  cobradorNombre: string;

  @ApiProperty()
  cantidadClientes: number;

  @ApiProperty()
  totalPrestamos: number;

  @ApiProperty()
  totalPagos: number;

  @ApiProperty()
  saldoPendiente: number;

  @ApiProperty({ type: [ClienteDetalleDto] })
  clientes: ClienteDetalleDto[];
}
