import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WompiService {
  private readonly logger = new Logger(WompiService.name);

  constructor(private readonly config: ConfigService) {}

  get publicKey(): string {
    return this.config.get<string>('WOMPI_PUBLIC_KEY') ?? '';
  }

  get currency(): string {
    return this.config.get<string>('WOMPI_CURRENCY') ?? 'COP';
  }

  private get integritySecret(): string {
    return this.config.get<string>('WOMPI_INTEGRITY_SECRET') ?? '';
  }

  private get eventsSecret(): string {
    return this.config.get<string>('WOMPI_EVENTS_SECRET') ?? '';
  }

  /**
   * Genera una referencia única para la transacción.
   * Formato: mm-<timestamp>-<random6>
   */
  generateReference(): string {
    const ts  = Date.now().toString(36).toUpperCase();
    const rnd = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `MM-${ts}-${rnd}`;
  }

  /**
   * Calcula el hash de integridad requerido por Wompi para el widget.
   * Fórmula: SHA256(reference + amountInCents + currency + integritySecret)
   *
   * @see https://docs.wompi.co/docs/colombia/widget-checkout-colombia/#campo-dataintegritytoken
   */
  calcularIntegrityHash(
    reference: string,
    amountInCents: number,
    currency: string,
  ): string {
    const cadena = `${reference}${amountInCents}${currency}${this.integritySecret}`;
    return crypto.createHash('sha256').update(cadena).digest('hex');
  }

  /**
   * Verifica la firma del webhook enviado por Wompi.
   * Wompi envía el header X-Event-Checksum con:
   *   SHA256(event.id + event.timestamp + eventsSecret)
   *
   * @see https://docs.wompi.co/docs/colombia/eventos/
   */
  verificarWebhookSignature(
    eventId: string,
    timestamp: number,
    checksum: string,
  ): boolean {
    if (!this.eventsSecret) {
      this.logger.warn('WOMPI_EVENTS_SECRET no configurado — saltando verificación de firma');
      return true; // en desarrollo sin secret configurado
    }
    const cadena   = `${eventId}${timestamp}${this.eventsSecret}`;
    const esperado = crypto.createHash('sha256').update(cadena).digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(esperado),
      Buffer.from(checksum),
    );
  }
}
