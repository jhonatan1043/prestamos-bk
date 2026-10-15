import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional } from 'class-validator';

export class CreateSuscripcionDto {
  @ApiProperty({ example: 1, description: 'ID del plan' })
  @IsInt()
  planId: number;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z', required: false, description: 'Ignorado: el servidor usa la fecha actual' })
  @IsOptional() @IsDateString()
  fechaInicio?: string;

  @ApiProperty({ example: '2025-12-31T00:00:00.000Z', required: false, description: 'Ignorado: el servidor calcula el vencimiento según el plan' })
  @IsOptional() @IsDateString()
  fechaFin?: string;
}
