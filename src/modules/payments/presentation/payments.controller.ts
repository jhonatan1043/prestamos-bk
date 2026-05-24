import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { Public }          from '../../../common/decorators/public.decorator';
import { PaymentsService } from '../application/payments.service';
import { InitiatePaymentDto } from '../application/dto/initiate-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /payments/initiate  — PÚBLICO
   *
   * Crea una transacción PENDING y retorna los datos para el widget de Wompi:
   *   { publicKey, reference, amountInCents, currency, integrityHash }
   *
   * Body: { planId, email, tenantNombre? }
   */
  @Public()
  @Post('initiate')
  initiate(@Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiate(dto);
  }

  /**
   * POST /payments/webhook  — PÚBLICO (llamado por Wompi)
   *
   * Recibe notificaciones de eventos de pago desde Wompi.
   * Wompi envía el header X-Event-Checksum para verificar autenticidad.
   *
   * @see https://docs.wompi.co/docs/colombia/eventos/
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Body() payload: any,
    @Headers('x-event-checksum') checksum: string,
  ) {
    await this.paymentsService.processWebhook(payload, checksum ?? '');
    return { received: true };
  }

  /**
   * GET /payments/status/:reference  — PÚBLICO
   *
   * Consulta el estado de una transacción por su referencia.
   * Usado por el cliente Flutter para verificar el resultado tras el redirect.
   */
  @Public()
  @Get('status/:reference')
  getStatus(@Param('reference') reference: string) {
    return this.paymentsService.getStatus(reference);
  }
}
