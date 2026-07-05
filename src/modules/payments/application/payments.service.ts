import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { WompiService }  from './wompi.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma:  PrismaService,
    private readonly wompi:   WompiService,
  ) {}

  // ─── Iniciar transacción ────────────────────────────────────────────────────

  /**
   * Crea una transacción PENDING y devuelve los datos necesarios
   * para renderizar el widget de Wompi en el cliente.
   */
  async initiate(dto: InitiatePaymentDto) {
    // Validar que el plan exista y sea de pago
    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan || !plan.activo) {
      throw new NotFoundException('Plan no encontrado o inactivo');
    }
    if (Number(plan.precio) === 0) {
      throw new BadRequestException('El plan es gratuito, no requiere pago');
    }

    const precioBase    = Number(plan.precio);
    const periodoAnual  = dto.periodoAnual ?? false;
    const precioFinal   = periodoAnual
      ? precioBase * 12 * 0.8   // anual: 12 meses con 20% de descuento
      : precioBase;
    const amountInCents = Math.round(precioFinal * 100);
    const currency      = this.wompi.currency;
    const reference     = this.wompi.generateReference();
    const integrityHash = this.wompi.calcularIntegrityHash(reference, amountInCents, currency);

    // Persistir transacción pendiente
    await this.prisma.wompiTransaccion.create({
      data: {
        reference,
        planId:       dto.planId,
        amountInCents,
        currency,
        email:        dto.email,
        tenantNombre: dto.tenantNombre ?? null,
        status:       'PENDING',
        periodoAnual,
      },
    });

    this.logger.log(`Transacción iniciada: ${reference} | plan=${plan.nombre} | ${amountInCents} ${currency}`);

    return {
      publicKey:     this.wompi.publicKey,
      reference,
      amountInCents,
      currency,
      integrityHash,
    };
  }

  // ─── Webhook ────────────────────────────────────────────────────────────────

  /**
   * Procesa el evento de webhook enviado por Wompi.
   * Actualiza el estado de la transacción según el resultado.
   *
   * Wompi envía el header X-Event-Checksum para verificar autenticidad.
   */
  async processWebhook(payload: any, checksum: string): Promise<void> {
    const eventId   = payload?.data?.id    ?? payload?.id    ?? '';
    const timestamp = payload?.timestamp   ?? payload?.sent_at ?? 0;

    // 1. Verificar firma
    const firmaOk = this.wompi.verificarWebhookSignature(eventId, Number(timestamp), checksum);
    if (!firmaOk) {
      this.logger.warn(`Webhook con firma inválida: eventId=${eventId}`);
      throw new BadRequestException('Firma del webhook inválida');
    }

    // 2. Extraer datos de la transacción de Wompi
    const tx         = payload?.data?.transaction ?? payload?.transaction ?? payload?.data ?? {};
    const reference  = tx.reference  ?? '';
    const wompiId    = tx.id         ?? '';
    const rawStatus  = (tx.status    ?? '').toUpperCase();

    if (!reference) {
      this.logger.warn('Webhook sin campo reference — ignorado');
      return;
    }

    // 3. Buscar la transacción local
    const local = await this.prisma.wompiTransaccion.findUnique({ where: { reference } });
    if (!local) {
      this.logger.warn(`Webhook para referencia desconocida: ${reference}`);
      return;
    }

    // Solo actualizar si no está ya procesada
    if (local.status !== 'PENDING') {
      this.logger.log(`Webhook duplicado para ${reference} — estado actual: ${local.status}`);
      return;
    }

    await this.prisma.wompiTransaccion.update({
      where: { reference },
      data:  { status: rawStatus, wompiId },
    });

    this.logger.log(`Webhook procesado: ${reference} → ${rawStatus}`);
  }

  // ─── Consultar estado ────────────────────────────────────────────────────────

  async getStatus(reference: string) {
    const tx = await this.prisma.wompiTransaccion.findUnique({ where: { reference } });
    if (!tx) throw new NotFoundException(`Transacción "${reference}" no encontrada`);
    return {
      reference:     tx.reference,
      status:        tx.status,
      planId:        tx.planId,
      amountInCents: tx.amountInCents,
      currency:      tx.currency,
      tenantId:      tx.tenantId,
      wompiId:       tx.wompiId,
    };
  }

  // ─── Validar antes de crear tenant ─────────────────────────────────────────

  /**
   * Verifica que una referencia de pago esté aprobada y no haya
   * sido usada para crear otro tenant.
   *
   * Lanza excepción si el pago no es válido.
   */
  async validatePagoAprobado(reference: string, planId: number): Promise<WompiTransaccion> {
    const tx = await this.prisma.wompiTransaccion.findUnique({ where: { reference } });

    if (!tx) {
      throw new BadRequestException(`No se encontró el pago con referencia "${reference}"`);
    }
    if (tx.status !== 'APPROVED') {
      throw new BadRequestException(
        `El pago no está aprobado. Estado actual: ${tx.status}. ` +
        'Completa el pago antes de crear la empresa.',
      );
    }
    if (tx.planId !== planId) {
      throw new BadRequestException('El pago no corresponde al plan seleccionado');
    }
    if (tx.tenantId !== null) {
      throw new BadRequestException('Esta referencia de pago ya fue utilizada para crear otra empresa');
    }

    return tx as any;
  }

  /**
   * Vincula una transacción aprobada con el tenant recién creado.
   */
  async vincularTenant(reference: string, tenantId: number): Promise<void> {
    await this.prisma.wompiTransaccion.update({
      where: { reference },
      data:  { tenantId },
    });
  }
}

// Tipo helper
interface WompiTransaccion {
  id:            number;
  reference:     string;
  planId:        number;
  amountInCents: number;
  currency:      string;
  email:         string;
  status:        string;
  tenantId:      number | null;
}
