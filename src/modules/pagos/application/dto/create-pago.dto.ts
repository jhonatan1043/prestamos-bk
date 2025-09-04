import { ApiProperty } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';
import { IsNumber, IsDateString } from 'class-validator';

export class CreatePagoDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  prestamoId: number;

  @ApiProperty({ example: '2025-09-04T12:00:00Z' })
  @IsDateString()
  fecha: Date;

  @ApiProperty({ example: 500000.0 })
  @IsNumber()
  monto: Decimal;
}
