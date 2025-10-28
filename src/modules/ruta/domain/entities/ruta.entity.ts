import { ApiProperty } from '@nestjs/swagger';

export class Ruta {
  @ApiProperty()
  id: number;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  sector: string;

  @ApiProperty()
  cobradorId: number;
}
