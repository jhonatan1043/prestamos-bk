import { ApiProperty } from '@nestjs/swagger';

export class Estado {
  @ApiProperty()
  id: number;

  @ApiProperty()
  nombre: string;
}
