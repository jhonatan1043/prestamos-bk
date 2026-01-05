import { ApiProperty } from '@nestjs/swagger';

export class User {

  @ApiProperty()
  active: boolean;

  @ApiProperty()
  id: number;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  password: string;

  @ApiProperty()
  role: string;
}

