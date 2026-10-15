import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsPositive, Max, Min } from 'class-validator';

export class CreatePagoEmpenoDto {
  @ApiProperty({ enum: ['INTERES', 'ABONO_CAPITAL', 'CANCELACION'], description: 'INTERES = refrendo; CANCELACION = rescate' })
  @IsIn(['INTERES', 'ABONO_CAPITAL', 'CANCELACION'], { message: 'tipo debe ser INTERES, ABONO_CAPITAL o CANCELACION' })
  tipo: 'INTERES' | 'ABONO_CAPITAL' | 'CANCELACION';

  @ApiProperty({ example: 50000 }) @IsNumber() @IsPositive()
  monto: number;

  @ApiPropertyOptional({ example: 1, description: 'Obligatorio para INTERES' })
  @IsOptional() @IsInt() @Min(1) @Max(120)
  periodosCubiertos?: number;

  @ApiPropertyOptional({ description: 'Por defecto, ahora' }) @IsOptional() @IsDateString()
  fecha?: string;
}
