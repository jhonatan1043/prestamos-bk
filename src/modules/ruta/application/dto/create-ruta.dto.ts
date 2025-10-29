import { IsInt, IsString } from 'class-validator';

export class CreateRutaDto {
  @IsString()
  nombre: string;

  @IsString()
  sector: string;

  @IsInt()
  cobradorId: number;
}
