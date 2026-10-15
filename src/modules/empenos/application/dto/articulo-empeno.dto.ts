import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class ArticuloEmpenoDto {
  @ApiProperty({ example: 'Mazda 3 gris, buen estado' })
  @IsString() @MaxLength(300)
  descripcion: string;

  @ApiPropertyOptional({ example: 'Vehículo' }) @IsOptional() @IsString() @MaxLength(100)
  categoria?: string;

  @ApiPropertyOptional({ example: 'Bueno' }) @IsOptional() @IsString() @MaxLength(100)
  estadoFisico?: string;

  @ApiPropertyOptional({ example: 'Bodega 1' }) @IsOptional() @IsString() @MaxLength(100)
  ubicacion?: string;

  @ApiPropertyOptional({ example: 45000000 }) @IsOptional() @IsNumber() @Min(0)
  valorAvaluo?: number;

  // ── Vehículo ──────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: 'ABC123' })
  @IsOptional() @IsString()
  @Matches(/^[A-Z0-9-]{4,10}$/i, { message: 'Placa inválida' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  placa?: string;

  @ApiPropertyOptional({ example: 'Mazda' }) @IsOptional() @IsString() @MaxLength(60)
  marca?: string;

  @ApiPropertyOptional({ example: '3 Touring' }) @IsOptional() @IsString() @MaxLength(60)
  modelo?: string;

  @ApiPropertyOptional({ example: 2019 })
  @IsOptional() @IsInt() @Min(1950) @Max(new Date().getFullYear() + 1)
  anio?: number;

  @ApiPropertyOptional({ example: 'Gris' }) @IsOptional() @IsString() @MaxLength(40)
  color?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40)
  numeroChasis?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40)
  numeroMotor?: string;

  @ApiPropertyOptional({ example: 85000 }) @IsOptional() @IsInt() @Min(0)
  kilometraje?: number;
}
