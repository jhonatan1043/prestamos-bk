import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { CreateEmpenoDto } from './create-empeno.dto';
import { ArticuloEmpenoDto } from './articulo-empeno.dto';

class ArticuloParcialDto extends PartialType(ArticuloEmpenoDto) {}

/** Cliente y tipo de artículo no se cambian; las condiciones financieras solo si no hay pagos. */
export class UpdateEmpenoDto extends PartialType(
  OmitType(CreateEmpenoDto, ['clienteId', 'tipoArticulo', 'articulo'] as const),
) {
  @ApiPropertyOptional({ type: ArticuloParcialDto })
  @IsOptional() @ValidateNested() @Type(() => ArticuloParcialDto)
  articulo?: ArticuloParcialDto;
}
