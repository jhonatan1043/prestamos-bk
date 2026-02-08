import { ApiProperty } from '@nestjs/swagger';

export class Estado {
  @ApiProperty()
  id: number;
  @ApiProperty()
  nombre: string;
}

import { Cliente } from '../../../clientes/domain/entities/cliente.entity';

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

  @ApiProperty({ enum: ['FIJO', 'SOBRE_SALDO'], example: 'FIJO', description: 'Tipo de préstamo: FIJO o SOBRE_SALDO' })
  tipoPrestamo: 'FIJO' | 'SOBRE_SALDO';

  @ApiProperty({ example: 1, required: false })
  estadoId?: number;

  @ApiProperty({ type: () => Cliente, required: false })
  cliente?: Cliente;
}
