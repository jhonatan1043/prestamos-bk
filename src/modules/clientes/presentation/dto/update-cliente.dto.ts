import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateClienteDto } from './create-cliente.dto';

// Omit usuarioId so it does not appear in Swagger for update
export class UpdateClienteDto extends OmitType(PartialType(CreateClienteDto), ['usuarioId'] as const) {
  correo?: string;
  sectorId?: number;
}
