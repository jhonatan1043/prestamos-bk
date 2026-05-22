import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

type EstadoTenant = 'ACTIVO' | 'SUSPENDIDO' | 'CANCELADO';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombre?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  planId?: number;

  @IsOptional()
  @IsEnum(['ACTIVO', 'SUSPENDIDO', 'CANCELADO'], {
    message: 'estado debe ser ACTIVO, SUSPENDIDO o CANCELADO',
  })
  estado?: EstadoTenant;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string;
}
