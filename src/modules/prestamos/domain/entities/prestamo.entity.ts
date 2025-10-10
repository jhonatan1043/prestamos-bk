import { ApiProperty } from '@nestjs/swagger';

export class Estado {
  @ApiProperty()
  id: number;
  @ApiProperty()
  nombre: string;
}

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

  @ApiProperty({ enum: ['DIA', 'SEMANA', 'MES'], example: 'DIA', description: 'Tipo de plazo: día, semana o mes' })
  tipoPlazo: 'DIA' | 'SEMANA' | 'MES';

  @ApiProperty()
  fechaInicio: Date;

  @ApiProperty()
  clienteId: number;

  @ApiProperty()
  usuarioId: number;

  @ApiProperty({ required: false })
  createdAt?: Date;

  @ApiProperty({ required: false })
  updatedAt?: Date;

  @ApiProperty({ type: () => Estado, required: false })
  estado?: Estado;
}
