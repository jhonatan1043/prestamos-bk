import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength } from 'class-validator';

export class ConsultaPortalPrestamosDto {
  @ApiProperty({ example: 'tenant_acme', description: 'Empresa donde se registró el préstamo' })
  @IsString() @Matches(/^[a-z][a-z0-9_]{0,62}$/, { message: 'schemaName inválido' })
  schemaName: string;

  @ApiProperty({ example: '1023456789' })
  @IsString() @MaxLength(30)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  identificacion: string;

  @ApiProperty({ example: '4567', description: 'Últimos 4 dígitos del teléfono registrado' })
  @IsString() @Matches(/^\d{4}$/, { message: 'Ingresa los últimos 4 dígitos del teléfono' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  ultimosTelefono: string;
}
