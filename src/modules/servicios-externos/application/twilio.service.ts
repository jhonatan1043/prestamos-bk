import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import Twilio from 'twilio';
import { HacerLlamadaDto } from '../presentation/dto/hacer-llamada.dto';

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
