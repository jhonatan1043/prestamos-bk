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

  private get privateKey(): string {
    return this.config.get<string>('WOMPI_PRIVATE_KEY') ?? '';
  }

  /**
   * Consulta la API de Wompi para obtener el estado real de una transacción
   * por referencia. Útil cuando el webhook no ha llegado todavía.
   *
   * Retorna { id, status } o null si no se encuentra / hay error.
   */
  async consultarTransaccionPorReferencia(
    reference: string,
  ): Promise<{ id: string; status: string } | null> {
    const sandbox = this.publicKey.startsWith('pub_test_');
    const baseUrl = sandbox
      ? 'https://sandbox.wompi.co/v1'
      : 'https://production.wompi.co/v1';

    try {
      const res = await fetch(
        `${baseUrl}/transactions?reference=${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${this.privateKey}` } },
      );
      if (!res.ok) return null;
      const json = (await res.json()) as { data?: any[] };
      const tx   = json?.data?.[0];
      if (!tx) return null;
      return { id: String(tx.id), status: String(tx.status ?? '').toUpperCase() };
    } catch (err) {
      this.logger.warn(`Error consultando API Wompi para ${reference}: ${err}`);
      return null;
    }
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
