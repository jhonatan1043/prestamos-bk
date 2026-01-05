import { IsString, IsNumber, IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGastoDto {
  @ApiProperty({ example: 'Compra de materiales' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty({ example: 150.75 })
  @IsNumber()
  monto: number;

  @ApiProperty({ example: '2024-01-04T12:00:00Z' })
  @IsDateString()
  fecha: Date;

  @ApiProperty({ example: 'Materiales' })
  @IsString()
  @IsNotEmpty()
  categoria: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  usuarioId: number;
}