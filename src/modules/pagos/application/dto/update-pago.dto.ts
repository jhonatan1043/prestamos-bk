// src/modules/pagos/application/dto/update-pago.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreatePagoDto } from './create-pago.dto';

export class UpdatePagoDto extends PartialType(CreatePagoDto) {}
