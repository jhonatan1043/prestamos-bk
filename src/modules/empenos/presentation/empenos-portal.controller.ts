import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { EmpenoPortalService } from '../application/empeno-portal.service';
import { ConsultaPortalDto } from '../application/dto/consulta-portal.dto';

/**
 * IP del cliente para el límite de intentos. Detrás de nginx, req.ip es la del
 * proxy; se usa el último valor de X-Forwarded-For, que es el que añade nginx
 * (los anteriores los puede enviar el propio cliente).
 */
export function ipCliente(req: any): string {
  const xff = req.headers?.['x-forwarded-for'];
  const ultimo = typeof xff === 'string' ? xff.split(',').pop()?.trim() : undefined;
  return ultimo || req.ip || 'desconocida';
}

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
