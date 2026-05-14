import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/jwt-auth.guard';
import { TwilioService } from '../application/twilio.service';
import { HacerLlamadaDto } from './dto/hacer-llamada.dto';

@ApiTags('servicios-externos/twilio')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('servicios-externos/twilio')
export class TwilioController {
  constructor(private readonly twilioService: TwilioService) {}

  @Post('llamadas')
  @ApiOperation({ summary: 'Iniciar una llamada telefónica via Twilio' })
  @ApiBody({ type: HacerLlamadaDto })
  @ApiResponse({ status: 201, description: 'Llamada iniciada exitosamente' })
  @ApiResponse({ status: 500, description: 'Error al iniciar la llamada' })
  async hacerLlamada(@Body() dto: HacerLlamadaDto) {
    return await this.twilioService.hacerLlamada(dto);
  }

  @Get('llamadas/:sid')
  @ApiOperation({ summary: 'Obtener el estado de una llamada por SID' })
  @ApiParam({ name: 'sid', type: String, description: 'SID de la llamada en Twilio' })
  @ApiResponse({ status: 200, description: 'Estado de la llamada retornado' })
  @ApiResponse({ status: 500, description: 'Error al consultar la llamada' })
  async obtenerEstadoLlamada(@Param('sid') sid: string) {
    return await this.twilioService.obtenerEstadoLlamada(sid);
  }
}
