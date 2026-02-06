import { ApiProperty } from '@nestjs/swagger';

export class RutaResumenDto {
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
}
