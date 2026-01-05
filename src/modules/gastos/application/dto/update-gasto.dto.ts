import { PartialType } from '@nestjs/mapped-types';
import { CreateGastoDto } from './create-gasto.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGastoDto extends PartialType(CreateGastoDto) {
	@ApiPropertyOptional({ example: 'Compra de materiales' })
	descripcion?: string;

	@ApiPropertyOptional({ example: 150.75 })
	monto?: number;

	@ApiPropertyOptional({ example: '2024-01-04T12:00:00Z' })
	fecha?: Date;

	@ApiPropertyOptional({ example: 'Materiales' })
	categoria?: string;

	@ApiPropertyOptional({ example: 1 })
	usuarioId?: number;
}