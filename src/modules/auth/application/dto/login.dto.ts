import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'tenant_acme_corp', description: 'Identificador del esquema de la empresa' })
  @IsString()
  @Matches(/^[a-z][a-z0-9_]{0,62}$/, { message: 'schemaName inválido' })
  schemaName: string;

  @ApiProperty({ example: 'admin@iatechsabana.online', description: 'Email del usuario' })
  @IsString()
  email: string;

  @ApiProperty({ example: 'MiClave123!', description: 'Contraseña del usuario' })
  @IsString()
  @MinLength(6)
  password: string;
}
