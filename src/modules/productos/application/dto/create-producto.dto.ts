import { IsString, IsOptional, IsNumber, IsInt, Min, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductoDto {
  @ApiProperty() @IsString() @MinLength(2)
  nombre: string;

  @ApiProperty() @IsString()
  codigo: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  descripcion?: string;

  @ApiProperty() @IsNumber()
  precioCompra: number;

  @ApiProperty() @IsNumber()
  precioVenta: number;

  @ApiProperty() @IsInt() @Min(0)
  stock: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0)
  stockMinimo?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt()
  categoriaId?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt()
  proveedorId?: number;
}

export class CreateCategoriaDto {
  @ApiProperty() @IsString() @MinLength(2)
  nombre: string;
}
