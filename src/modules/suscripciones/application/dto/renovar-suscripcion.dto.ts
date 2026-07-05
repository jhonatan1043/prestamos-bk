import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class RenovarSuscripcionDto {
  @ApiProperty({ example: 2, description: 'ID del plan a activar' })
  @IsInt()
  @IsPositive()
  planId: number;

  @ApiProperty({ example: 'MYM-20260101-ABC123', description: 'Referencia del pago aprobado en Wompi' })
  @IsString()
  @IsNotEmpty()
  reference: string;

  @ApiPropertyOptional({ description: 'true = plan anual (365 días, 20% de descuento aplicado en el pago)' })
  @IsOptional()
  @IsBoolean()
  periodoAnual?: boolean;
}
