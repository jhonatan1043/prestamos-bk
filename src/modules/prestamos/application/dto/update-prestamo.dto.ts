import { PartialType } from '@nestjs/mapped-types';
import { CreatePrestamoDto } from './create-prestamo.dto';

import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePrestamoDto extends PartialType(CreatePrestamoDto) {
	@ApiPropertyOptional({ enum: ['FIJO', 'SOBRE_SALDO'], example: 'FIJO', description: 'Tipo de préstamo: FIJO o SOBRE_SALDO' })
	tipoPrestamo?: 'FIJO' | 'SOBRE_SALDO';
}
