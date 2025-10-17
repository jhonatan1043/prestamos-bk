import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class UpdateEstadoPrestamoDto {
  @ApiProperty({ example: 2, description: 'ID del nuevo estado para el préstamo' })
  @IsInt()
  estadoId: number;
}
