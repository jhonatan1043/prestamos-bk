import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RecoverPasswordDto {
  @ApiProperty({
    example: 'tenant_acme_corp',
    description: 'Identificador del esquema de la empresa',
  })
  @IsString()
  schemaName: string;

  @ApiProperty({ example: 'usuario@empresa.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'NuevaClaveSegura123!', description: 'Nueva contraseña (mín. 8 caracteres)' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
