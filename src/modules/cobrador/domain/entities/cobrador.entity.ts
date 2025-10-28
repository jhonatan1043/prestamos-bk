import { ApiProperty } from '@nestjs/swagger';

export class Cobrador {
  @ApiProperty()
  id: number;

  @ApiProperty()
  usuarioId: number;
}
