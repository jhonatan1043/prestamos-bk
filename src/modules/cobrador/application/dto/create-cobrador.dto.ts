import { IsInt } from 'class-validator';

export class CreateCobradorDto {
  @IsInt()
  usuarioId: number;
}
