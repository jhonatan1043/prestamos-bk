import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

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
}
