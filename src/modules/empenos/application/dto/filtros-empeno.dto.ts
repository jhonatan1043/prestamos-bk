import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsPositive, IsString, Max, MaxLength, Min } from 'class-validator';

export class FiltrosEmpenoDto {
  @ApiPropertyOptional({ enum: ['ACTIVO', 'VENCIDO', 'RECUPERADO', 'VENDIDO', 'ADJUDICADO'] })
  @IsOptional() @IsIn(['ACTIVO', 'VENCIDO', 'RECUPERADO', 'VENDIDO', 'ADJUDICADO'])
  estado?: 'ACTIVO' | 'VENCIDO' | 'RECUPERADO' | 'VENDIDO' | 'ADJUDICADO';

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @IsPositive()
  clienteId?: number;

  @ApiPropertyOptional({ description: 'Código, placa o descripción' })
  @IsOptional() @IsString() @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ description: 'Activos que vencen en los próximos N días' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(90)
  vencenEnDias?: number;

  @ApiPropertyOptional({ description: 'Solo admin' })
  @IsOptional() @IsIn(['true', 'false'])
  incluirEliminados?: 'true' | 'false';
}
