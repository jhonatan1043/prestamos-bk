import { IsString, IsOptional, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClienteDto {
  @ApiProperty({ description: 'Tipo de identificación del cliente (CC, TI, etc.)' })
  @IsString()
  tipoIdentificacion: string;

  @ApiProperty({ description: 'Número de identificación del cliente' })
  @IsString()
  identificacion: string;

  @ApiProperty({ description: 'Nombres completos del cliente' })
  @IsString()
  nombres: string;

  @ApiProperty({ description: 'Apellidos completos del cliente' })
  @IsString()
  apellidos: string;

  @ApiProperty({ description: 'Edad del cliente', required: false, example: 30 })
  @IsOptional()
  @IsInt()
  edad?: number;
}
