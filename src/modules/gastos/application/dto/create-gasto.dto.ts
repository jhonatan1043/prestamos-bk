import { IsEnum, IsNumber, IsDateString, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TipoGasto } from '@prisma/client';

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

  @ApiProperty({
    enum: TipoGasto,
    example: TipoGasto.OPERATIVO,
    description: 'OPERATIVO | PERSONAL | ADMINISTRATIVO | FINANCIERO | JURIDICO | OTROS',
  })
  @IsEnum(TipoGasto)
  categoria: TipoGasto;

  @ApiProperty({ example: 1 })
  @IsNumber()
  usuarioId: number;
}