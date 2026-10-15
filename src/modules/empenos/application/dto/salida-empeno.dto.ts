import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class SalidaEmpenoDto {
  @ApiProperty({ enum: ['VENDIDO', 'ADJUDICADO'] })
  @IsIn(['VENDIDO', 'ADJUDICADO'], { message: 'tipo debe ser VENDIDO o ADJUDICADO' })
  tipo: 'VENDIDO' | 'ADJUDICADO';

  @ApiPropertyOptional({ example: 1500000, description: 'Valor recibido por la venta' })
  @IsOptional() @IsNumber() @Min(0)
  montoSalida?: number;

  @ApiProperty({ example: 'Vendido en vitrina' })
  @IsString() @MinLength(3) @MaxLength(300)
  motivo: string;
}
