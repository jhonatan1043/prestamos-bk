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
   * Verifica la firma de un evento de Wompi según su documentación:
   * SHA256( valores de signature.properties (leídos dentro de data) + timestamp + secreto de eventos ).
   * La firma llega en signature.checksum y en la cabecera X-Event-Checksum.
   * Sin secreto configurado se rechaza: antes se aceptaba cualquier webhook.
   *
   * @see https://docs.wompi.co/docs/colombia/eventos/
   */
  verificarEvento(evento: any, checksumCabecera?: string): boolean {
    if (!this.eventsSecret) {
      this.logger.error('WOMPI_EVENTS_SECRET no configurado — webhook rechazado');
      return false;
    }
    const propiedades: string[] = evento?.signature?.properties ?? [];
    if (!Array.isArray(propiedades) || propiedades.length === 0) return false;

    const valores = propiedades.map(ruta =>
      ruta.split('.').reduce((obj: any, k: string) => (obj == null ? undefined : obj[k]), evento?.data));
    if (valores.some(v => v === undefined || v === null)) return false;

    const esperado = crypto.createHash('sha256')
      .update(`${valores.join('')}${evento?.timestamp ?? ''}${this.eventsSecret}`)
      .digest('hex');
    const recibido = String(evento?.signature?.checksum || checksumCabecera || '').toLowerCase();
    if (recibido.length !== esperado.length) return false;
    return crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(recibido));
  }
}
