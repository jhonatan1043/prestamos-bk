import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import Twilio from 'twilio';
import { HacerLlamadaDto } from '../presentation/dto/hacer-llamada.dto';

const E164 = /^\+[1-9]\d{1,14}$/;

/**
 * Número en formato E.164 y, si TWILIO_ALLOWED_PREFIXES está definido
 * (ej: "+57,+593"), dentro de los prefijos permitidos. Evita fraude de
 * llamadas a números internacionales o de tarifa especial.
 */
export function esNumeroPermitido(numero: string): boolean {
  if (!E164.test(numero)) return false;
  const prefijos = (process.env.TWILIO_ALLOWED_PREFIXES ?? '')
    .split(',').map(p => p.trim()).filter(Boolean);
  return prefijos.length === 0 || prefijos.some(p => numero.startsWith(p));
}

export function escaparXml(valor: string): string {
  return valor.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));
}

/**
 * Solo se aceptan URLs TwiML propias (/servicios-externos/twilio/twiml/*) en el
 * host público de la API (API_PUBLIC_URL), o la URL por defecto del .env.
 */
function esTwimlUrlPermitida(url: string, porDefecto: string): boolean {
  if (url === porDefecto) return true;
  const base = process.env.API_PUBLIC_URL;
  if (!base) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:'
      && u.host === new URL(base).host
      && u.pathname.startsWith('/servicios-externos/twilio/twiml/');
  } catch {
    return false;
  }
}

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private readonly client: Twilio.Twilio;
  private readonly fromNumber: string;
  private readonly defaultTwimlUrl: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_FROM_NUMBER ?? '';
    this.defaultTwimlUrl = process.env.TWILIO_TWIML_URL ?? 'https://demo.twilio.com/docs/voice.xml';

    if (!accountSid || !authToken || !this.fromNumber) {
      throw new InternalServerErrorException(
        'Faltan variables de entorno de Twilio: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER',
      );
    }

    this.client = Twilio(accountSid, authToken);
  }

  async hacerLlamada(dto: HacerLlamadaDto) {
    const twimlUrl = dto.twimlUrl ?? this.defaultTwimlUrl;
    if (!esNumeroPermitido(dto.to)) {
      throw new BadRequestException('Número de destino no permitido');
    }
    if (!esTwimlUrlPermitida(twimlUrl, this.defaultTwimlUrl)) {
      throw new BadRequestException('twimlUrl no permitida');
    }
    const tecnico = new URL(twimlUrl).searchParams.get('tecnico');
    if (tecnico !== null && !esNumeroPermitido(tecnico)) {
      throw new BadRequestException('Número de conexión no permitido');
    }
    this.logger.log(`📞 hacerLlamada → to=${dto.to} | twimlUrl=${twimlUrl}`);
    try {
      const llamada = await this.client.calls.create({
        to: dto.to,
        from: this.fromNumber,
        url: twimlUrl,
        method: 'GET',   // el endpoint /twiml/conectar solo acepta GET
      });

      this.logger.log(`Llamada iniciada: SID=${llamada.sid} to=${dto.to}`);

      return {
        sid: llamada.sid,
        status: llamada.status,   // para Flutter
        estado: llamada.status,   // compatibilidad
        to: llamada.to,
        from: llamada.from,
        fechaCreacion: llamada.dateCreated,
      };
    } catch (error) {
      this.logger.error(`Error al iniciar llamada a ${dto.to}: ${error.message}`);
      throw new InternalServerErrorException(`Error de Twilio: ${error.message}`);
    }
  }

  async obtenerEstadoLlamada(sid: string) {
    try {
      const llamada = await this.client.calls(sid).fetch();
      return {
        sid: llamada.sid,
        status: llamada.status,   // para Flutter
        estado: llamada.status,   // compatibilidad
        duration: llamada.duration,
        duracion: llamada.duration,
        to: llamada.to,
        from: llamada.from,
        fechaCreacion: llamada.dateCreated,
        fechaActualizacion: llamada.dateUpdated,
      };
    } catch (error) {
      this.logger.error(`Error al obtener estado de llamada ${sid}: ${error.message}`);
      throw new InternalServerErrorException(`Error de Twilio: ${error.message}`);
    }
  }
}
