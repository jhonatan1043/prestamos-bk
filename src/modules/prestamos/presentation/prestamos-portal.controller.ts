import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { ipCliente } from '../../empenos/presentation/empenos-portal.controller';
import { PrestamoPortalService } from '../application/prestamo-portal.service';
import { ConsultaPortalPrestamosDto } from '../application/dto/consulta-portal-prestamos.dto';

@ApiTags('prestamos')
@Controller('prestamos/portal')
export class PrestamosPortalController {
  constructor(private readonly portal: PrestamoPortalService) {}

  @Public()
  @Post('consulta')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'PÚBLICO — el cliente consulta sus préstamos con identificación y últimos 4 dígitos del teléfono' })
  consultar(@Req() req, @Body() dto: ConsultaPortalPrestamosDto) {
    return this.portal.consultar(dto, ipCliente(req));
  }
}
