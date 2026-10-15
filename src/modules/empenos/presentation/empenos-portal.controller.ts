import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { EmpenoPortalService } from '../application/empeno-portal.service';
import { ConsultaPortalDto } from '../application/dto/consulta-portal.dto';
import { ipCliente } from '../../../common/http/ip-cliente';

export { ipCliente };

@ApiTags('empenos')
@Controller('empenos/portal')
export class EmpenosPortalController {
  constructor(private readonly portal: EmpenoPortalService) {}

  @Public()
  @Post('consulta')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'PÚBLICO — el cliente consulta sus empeños con identificación y código de consulta' })
  consultar(@Req() req, @Body() dto: ConsultaPortalDto) {
    return this.portal.consultar(dto, ipCliente(req));
  }
}
