import { PartialType } from '@nestjs/mapped-types';
import { CreatePrestamoDto } from './create-prestamo.dto';

export class UpdatePrestamoDto extends PartialType(CreatePrestamoDto) {}
