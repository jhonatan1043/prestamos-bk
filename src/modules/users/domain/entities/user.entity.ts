import { ApiProperty } from '@nestjs/swagger';

export class User {
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
  
  @ApiProperty()
  estadoId: number;
  // Relación opcional para incluir el objeto Estado si se desea
  estado?: any;
}

