import { IsInt, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRutaDto {
  @ApiProperty({ example: 'Ruta 1' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'Centro' })
  @IsString()
  sector: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  cobradorId: number;
}
