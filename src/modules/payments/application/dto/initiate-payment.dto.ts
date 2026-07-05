import { IsBoolean, IsEmail, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class InitiatePaymentDto {
  @IsInt()
  @IsPositive()
  planId: number;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  tenantNombre?: string;

  /** Si es true, se cobra precio × 12 × 0.80 (plan anual con 20% de descuento) */
  @IsOptional()
  @IsBoolean()
  periodoAnual?: boolean;
}
