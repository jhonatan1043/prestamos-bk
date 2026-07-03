import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProveedorDto {
  @ApiProperty() @IsString() @MinLength(2)
  nombre: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  contacto?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  telefono?: string;

  @ApiPropertyOptional() @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  direccion?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  notas?: string;
}
