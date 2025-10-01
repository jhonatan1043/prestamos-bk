import { ApiProperty } from '@nestjs/swagger';
export class Prestamo {
  @ApiProperty()
  id: number;

  @ApiProperty()
  codigo: string;

  @ApiProperty()
  monto: number;

  @ApiProperty()
  tasa: number;

  @ApiProperty()
  plazoDias: number;

  @ApiProperty()
  fechaInicio: Date;

  @ApiProperty()
  estado: string;

  @ApiProperty()
  clienteId: number;

  @ApiProperty()
  usuarioId: number;

  @ApiProperty({ required: false })
  createdAt?: Date;

  @ApiProperty({ required: false })
  updatedAt?: Date;
}
