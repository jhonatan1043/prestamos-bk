import { IsInt, IsNumber, IsString, IsOptional, IsEnum, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ItemVentaDto {
  @ApiProperty() @IsInt()
  productoId: number;

  @ApiProperty() @IsInt() @Min(1)
  cantidad: number;

  @ApiProperty() @IsNumber()
  precioUnit: number;
}

export class CreateVentaDto {
  @ApiProperty() @IsInt()
  clienteId: number;

  @ApiProperty({ enum: ['DIA', 'SEMANA', 'MES'] })
  @IsEnum(['DIA', 'SEMANA', 'MES'])
  tipoPlazo: 'DIA' | 'SEMANA' | 'MES';

  @ApiProperty() @IsInt() @Min(1)
  numeroCuotas: number;

  @ApiProperty() @IsString()
  fechaInicio: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  notas?: string;

  @ApiProperty({ type: [ItemVentaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemVentaDto)
  items: ItemVentaDto[];
}
