import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength } from 'class-validator';

export class ConsultaPortalDto {
  @ApiProperty({ example: 'tenant_acme', description: 'Empresa donde se registró el empeño' })
  @IsString() @Matches(/^[a-z][a-z0-9_]{0,62}$/, { message: 'schemaName inválido' })
  schemaName: string;

  @ApiProperty({ example: '1023456789' })
  @IsString() @MaxLength(30)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  identificacion: string;

  @ApiProperty({ example: 'ABC234', description: 'Código de consulta entregado al registrar el empeño' })
  @IsString() @Matches(/^[A-Z0-9]{6}$/i, { message: 'El código de consulta tiene 6 caracteres' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  codigoConsulta: string;
}
