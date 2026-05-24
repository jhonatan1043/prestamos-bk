import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsInt()
  @IsPositive()
  planId: number;

  /**
   * Slug opcional para el nombre del esquema. Si se omite se genera
   * automáticamente a partir del nombre. Solo letras, números y guión bajo.
   * Ejemplo: "acme_corp"
   */
  @IsOptional()
  @IsString()
  @Matches(/^[a-z][a-z0-9_]{2,60}$/, {
    message: 'schemaSlug solo puede contener letras minúsculas, números y guión bajo (mín 3, máx 61 chars) y debe empezar con letra',
  })
  schemaSlug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string;

  /**
   * Referencia del pago aprobado por Wompi.
   * Obligatorio cuando el plan seleccionado tiene precio > 0.
   */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentReference?: string;
}
