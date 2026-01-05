import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCobradorDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  usuarioId: number;
}
