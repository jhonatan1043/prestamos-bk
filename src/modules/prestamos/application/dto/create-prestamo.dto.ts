import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsNumber, IsPositive, Max, Min } from 'class-validator';

export class CreatePrestamoDto {

  @ApiProperty({ example: 5000.00, description: 'Monto del préstamo (mayor a 0)' })
  @IsNumber()
  @IsPositive()
  monto: number;

  @ApiProperty({ example: 5.5, description: 'Tasa de interés anual (0 - 100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  tasa: number;

  @ApiProperty({ example: 30, description: 'Número de cuotas (1 - 365)' })
  @IsInt()
  @Min(1)
  @Max(365)
  plazoDias: number;

  @ApiProperty({ enum: ['DIA', 'SEMANA', 'MES'], example: 'DIA', description: 'Tipo de plazo' })
  @IsIn(['DIA', 'SEMANA', 'MES'], { message: 'tipoPlazo debe ser DIA, SEMANA o MES' })
  tipoPlazo: 'DIA' | 'SEMANA' | 'MES';

  @ApiProperty({ example: '2025-09-04T00:00:00.000Z', description: 'Fecha de inicio del préstamo' })
  @IsDateString()
  fechaInicio: string;

  @ApiProperty({ example: 1, description: 'ID del estado del préstamo' })
  @IsInt()
  estadoId: number;

  @ApiProperty({ example: 1, description: 'ID del cliente' })
  @IsInt()
  clienteId: number;

  @ApiProperty({ example: 1, description: 'ID del usuario que registra el préstamo' })
  @IsInt()
  usuarioId: number;

  @ApiProperty({ enum: ['FIJO', 'SOBRE_SALDO'], example: 'FIJO', description: 'Tipo de préstamo' })
  @IsIn(['FIJO', 'SOBRE_SALDO'], { message: 'tipoPrestamo debe ser FIJO o SOBRE_SALDO' })
  tipoPrestamo: 'FIJO' | 'SOBRE_SALDO';
}
