import { ApiProperty } from '@nestjs/swagger';

export class Empresa {
  @ApiProperty()
  id: number;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  ruc: string;

  @ApiProperty()
  direccion: string;

  @ApiProperty()
  telefono: string;

  @ApiProperty()
  correo: string;

  @ApiProperty({ required: false })
  logoUrl?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
