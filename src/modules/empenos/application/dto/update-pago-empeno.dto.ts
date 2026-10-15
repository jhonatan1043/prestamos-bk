import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePagoEmpenoDto } from './create-pago-empeno.dto';

/** El tipo de un pago no se cambia: se elimina y se registra otro. */
export class UpdatePagoEmpenoDto extends PartialType(OmitType(CreatePagoEmpenoDto, ['tipo'] as const)) {}
