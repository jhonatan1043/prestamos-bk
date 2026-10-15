import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength, IsString, Matches } from 'class-validator';
import { ROLES_ASIGNABLES } from '../../../../common/auth/roles';

export class CreateUserDto {
  @ApiProperty()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'ADMIN', description: 'ADMIN, ADMINISTRADOR, USER, USUARIO o COBRADOR' })
  @IsString()
  @Matches(ROLES_ASIGNABLES, { message: 'Rol no permitido' })
  role: string;
}
