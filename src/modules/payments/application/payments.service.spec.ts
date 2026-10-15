import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';

describe('PaymentsService.processWebhook', () => {
  const evento = (monto: number) => ({ data: { transaction: { id: 'w1', reference: 'MM-1', status: 'APPROVED', amount_in_cents: monto } } });
  let prisma: any;
  let svc: PaymentsService;

  beforeEach(() => {
    prisma = { wompiTransaccion: {
      findUnique: jest.fn().mockResolvedValue({ reference: 'MM-1', status: 'PENDING', amountInCents: 4490000 }),
      update: jest.fn(),
    } };
    svc = new PaymentsService(prisma, { verificarEvento: () => true } as any);
  });

  it('aprueba cuando el monto coincide', async () => {
    await svc.processWebhook(evento(4490000), '');
    expect(prisma.wompiTransaccion.update).toHaveBeenCalledWith({ where: { reference: 'MM-1' }, data: { status: 'APPROVED', wompiId: 'w1' } });
  });

  it('no aprueba si el monto pagado es distinto al cobrado', async () => {
    await svc.processWebhook(evento(100), '');
    expect(prisma.wompiTransaccion.update).not.toHaveBeenCalled();
  });

  it('rechaza un evento con firma inválida', async () => {
    svc = new PaymentsService(prisma, { verificarEvento: () => false } as any);
    await expect(svc.processWebhook(evento(4490000), '')).rejects.toBeInstanceOf(BadRequestException);
  });
});
