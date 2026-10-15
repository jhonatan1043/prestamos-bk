import { createHash } from 'crypto';
import { WompiService } from './wompi.service';

const evento = (checksum?: string) => ({
  event: 'transaction.updated',
  data: { transaction: { id: '1234-1610641025-49201', status: 'APPROVED', amount_in_cents: 4490000, reference: 'MM-1' } },
  signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'], checksum },
  timestamp: 1530291411,
});

const calcular = (secreto: string) =>
  createHash('sha256').update(`1234-1610641025-49201APPROVED44900001530291411${secreto}`).digest('hex');

describe('WompiService.verificarEvento', () => {
  const svc = (secreto?: string) =>
    new WompiService({ get: (k: string) => (k === 'WOMPI_EVENTS_SECRET' ? secreto : undefined) } as any);

  it('acepta la firma calculada con signature.properties + timestamp + secreto', () => {
    expect(svc('secreto_eventos').verificarEvento(evento(calcular('secreto_eventos')))).toBe(true);
  });

  it('también acepta la firma en la cabecera X-Event-Checksum', () => {
    expect(svc('secreto_eventos').verificarEvento(evento(undefined), calcular('secreto_eventos'))).toBe(true);
  });

  it('rechaza una firma con otro secreto o de otra longitud', () => {
    expect(svc('secreto_eventos').verificarEvento(evento(calcular('otro')))).toBe(false);
    expect(svc('secreto_eventos').verificarEvento(evento('abc'))).toBe(false);
  });

  it('sin secreto configurado rechaza (antes aceptaba cualquier webhook)', () => {
    expect(svc(undefined).verificarEvento(evento(calcular('')))).toBe(false);
  });
});
