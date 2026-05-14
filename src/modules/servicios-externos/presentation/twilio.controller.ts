import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import type { Response } from 'express';
import { TwilioService } from '../application/twilio.service';
import { HacerLlamadaDto } from './dto/hacer-llamada.dto';

@ApiTags('servicios-externos/twilio')
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

  @Get('twiml/conectar')
  @ApiOperation({ summary: 'TwiML: conecta la llamada entrante con el número del técnico' })
  @ApiQuery({ name: 'tecnico', type: String, description: 'Número del técnico en formato E.164 (ej: +573001234567)' })
  @ApiResponse({ status: 200, description: 'XML TwiML devuelto correctamente' })
  twimlConectar(@Query('tecnico') tecnico: string, @Res() res: Response) {
    const fromNumber = process.env.TWILIO_FROM_NUMBER ?? '';
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${fromNumber}">
    <Number>${tecnico}</Number>
  </Dial>
</Response>`;
    res.setHeader('Content-Type', 'text/xml');
    res.send(xml);
  }
}
