import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class MovimientosQueryDto {
  @ApiProperty({ example: '2026-10-01' }) @IsDateString()
  desde: string;

  @ApiProperty({ example: '2026-10-31' }) @IsDateString()
  hasta: string;

  @ApiPropertyOptional({ enum: ['ENTRADA', 'REFRENDO', 'ABONO', 'SALIDA', 'CAMBIO_ESTADO', 'EDICION', 'ELIMINACION'] })
  @IsOptional() @IsIn(['ENTRADA', 'REFRENDO', 'ABONO', 'SALIDA', 'CAMBIO_ESTADO', 'EDICION', 'ELIMINACION'])
  tipo?: 'ENTRADA' | 'REFRENDO' | 'ABONO' | 'SALIDA' | 'CAMBIO_ESTADO' | 'EDICION' | 'ELIMINACION';
}
