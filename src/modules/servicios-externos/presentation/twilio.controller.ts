import { Body, Controller, Get, Param, Post, Query, Res, HttpCode } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import type { Response } from 'express';
import { TwilioService } from '../application/twilio.service';
import { HacerLlamadaDto } from './dto/hacer-llamada.dto';

@ApiTags('servicios-externos/twilio')
@Controller('servicios-externos/twilio')
export class TwilioController {
  constructor(private readonly twilioService: TwilioService) { }

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

  // Twilio llama a este endpoint cuando la llamada es contestada.
  // Se registra tanto GET como POST para cubrir ambos métodos de Twilio.
  @Get('twiml/conectar')
  @ApiOperation({ summary: 'TwiML: conecta la llamada con el número destino (GET)' })
  @ApiQuery({ name: 'tecnico', type: String, description: 'Número destino (técnico o cliente)' })
  @ApiResponse({ status: 200, description: 'XML TwiML devuelto correctamente' })
  twimlConectarGet(@Query('tecnico') tecnico: string, @Res() res: Response) {
    return this._twimlResponse(tecnico, res);
  }

  @Post('twiml/conectar')
  @HttpCode(200)
  @ApiOperation({ summary: 'TwiML: conecta la llamada con el número destino (POST)' })
  @ApiResponse({ status: 200, description: 'XML TwiML devuelto correctamente' })
  twimlConectarPost(@Query('tecnico') tecnico: string, @Res() res: Response) {
    return this._twimlResponse(tecnico, res);
  }

  private _twimlResponse(tecnico: string, res: Response) {
    const fromNumber = process.env.TWILIO_FROM_NUMBER ?? '';
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="es-MX" voice="alice">Por favor espere, estamos conectando con su cliente.</Say>
  <Dial callerId="${fromNumber}" timeout="30">
    <Number>${tecnico}</Number>
  </Dial>
  <Hangup/>
</Response>`;
    res.setHeader('Content-Type', 'text/xml');
    res.send(xml);
  }
}
