import { ApiProperty } from '@nestjs/swagger';

export class Cobrador {
  @ApiProperty()
  id: number;

  @ApiProperty()
  usuarioId: number;

  constructor(id: number, usuarioId: number) {
    this.id = id;
    this.usuarioId = usuarioId;
  }
}
