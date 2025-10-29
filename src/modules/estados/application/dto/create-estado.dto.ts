import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateEstadoDto {
  @ApiProperty({ example: 'ACTIVO', description: 'Nombre del estado' })
  @IsString()
  nombre: string;
}
