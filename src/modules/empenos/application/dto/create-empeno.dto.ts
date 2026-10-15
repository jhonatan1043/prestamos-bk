import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { ArticuloEmpenoDto } from './articulo-empeno.dto';

export class CreateEmpenoDto {
  @ApiProperty({ example: 1 }) @IsInt() @IsPositive()
  clienteId: number;

  @ApiProperty({ enum: ['VEHICULO', 'GENERAL'] })
  @IsIn(['VEHICULO', 'GENERAL'], { message: 'tipoArticulo debe ser VEHICULO o GENERAL' })
  tipoArticulo: 'VEHICULO' | 'GENERAL';

  @ApiProperty({ example: 5000000 }) @IsNumber() @IsPositive()
  montoPrestado: number;

  @ApiProperty({ example: 5, description: 'Tasa de interés % por periodo (1 - 100)' })
  @IsNumber() @Min(1) @Max(100)
  tasa: number;

  @ApiPropertyOptional({ enum: ['DIA', 'SEMANA', 'MES'], default: 'MES' })
  @IsOptional() @IsIn(['DIA', 'SEMANA', 'MES'], { message: 'tipoPlazo debe ser DIA, SEMANA o MES' })
  tipoPlazo?: 'DIA' | 'SEMANA' | 'MES';

  @ApiProperty({ example: 1, description: 'Periodos mínimos antes del rescate' })
  @IsInt() @Min(1) @Max(120)
  periodosMinimos: number;

  @ApiProperty({ example: 4, description: 'Periodos hasta la fecha máxima' })
  @IsInt() @Min(1) @Max(120)
  periodosMaximos: number;

  @ApiPropertyOptional({ description: 'Por defecto, ahora' }) @IsOptional() @IsDateString()
  fechaIngreso?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  notas?: string;

  @ApiProperty({ type: ArticuloEmpenoDto })
  @ValidateNested() @Type(() => ArticuloEmpenoDto)
  articulo: ArticuloEmpenoDto;
}
