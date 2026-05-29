import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class RenovarSuscripcionDto {
  @ApiProperty({ example: 2, description: 'ID del plan a activar' })
  @IsInt()
  @IsPositive()
  planId: number;

  @ApiProperty({ example: 'MYM-20260101-ABC123', description: 'Referencia del pago aprobado en Wompi' })
  @IsString()
  @IsNotEmpty()
  reference: string;
}
