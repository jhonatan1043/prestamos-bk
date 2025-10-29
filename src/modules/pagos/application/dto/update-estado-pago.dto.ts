import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

export class UpdateEstadoPagoDto {
  @ApiProperty({ example: 2, description: 'ID del nuevo estado para el pago' })
  @IsInt()
  @IsNotEmpty()
  estadoId: number;
}
