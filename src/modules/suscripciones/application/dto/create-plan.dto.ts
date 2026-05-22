import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ example: 'Gratuito' })
  @IsString() @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'Plan de inicio sin costo', required: false })
  @IsOptional() @IsString()
  descripcion?: string;

  @ApiProperty({
    example: ['5 usuarios', '100 clientes', 'Soporte por email'],
    description: 'Lista de características visibles en la UI',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  caracteristicas?: string[];

  @ApiProperty({ example: 2, description: 'Máximo de usuarios. -1 = ilimitado' })
  @IsInt() @Min(-1)
  maxUsuarios: number;

  @ApiProperty({ example: 50, description: 'Máximo de clientes. -1 = ilimitado' })
  @IsInt() @Min(-1)
  maxClientes: number;

  @ApiProperty({ example: 5, description: 'Máximo de préstamos por cliente. -1 = ilimitado' })
  @IsInt() @Min(-1)
  maxPrestamosPorCliente: number;

  @ApiProperty({ example: 0.00, description: 'Precio mensual del plan' })
  @IsNumber() @Min(0)
  precio: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional() @IsBoolean()
  activo?: boolean;
}
