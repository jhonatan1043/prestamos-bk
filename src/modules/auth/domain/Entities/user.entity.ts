import { ApiProperty } from '@nestjs/swagger';

export class User {
  @ApiProperty()
  id: number;

  @ApiProperty()
  email: string;

  @ApiProperty()
  password: string;

  @ApiProperty()
  roles: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  active: boolean;
}
