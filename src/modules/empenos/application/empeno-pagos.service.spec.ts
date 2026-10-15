import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EmpenosService } from './empenos.service';
import { EmpenoPagosService } from './empeno-pagos.service';
import { admin, cobrador, crearPrismaFalso, empenoDb } from './testing/fake-prisma';

const dia = (d: Date) => d.toISOString().slice(0, 10);

describe('EmpenoPagosService', () => {
  let prisma: any;
  let audit: { log: jest.Mock };
  let svc: EmpenoPagosService;

  const updatesDeEmpeno = () => prisma.client.empeno.update.mock.calls.map((c: any) => c[0].data);

  beforeEach(() => {
    prisma = crearPrismaFalso();
    audit  = { log: jest.fn() };
    const empenos = new EmpenosService(prisma, audit as any);
    svc = new EmpenoPagosService(prisma, empenos, audit as any);
    // Fecha máxima original 2026-05-01 (ingreso 2026-01-01 + 4 meses)
    prisma.client.empeno.findFirst.mockResolvedValue(empenoDb({ fechaMaxima: new Date('2026-05-01') }));
    prisma.client.pagoEmpeno.create.mockImplementation(({ data }) => Promise.resolve({ id: 99, ...data }));
  });

  it('refrendo actualiza fechaMaxima y registra REFRENDO', async () => {
    await svc.registrarPago(1, { tipo: 'INTERES', monto: 50_000, periodosCubiertos: 1, fecha: '2026-01-15T00:00:00.000Z' }, admin);
    const data = updatesDeEmpeno()[0];
    expect(dia(data.fechaMaxima)).toBe('2026-06-01');
    expect(data.periodosPagados).toBe(1);
    expect(prisma.client.movimientoEmpeno.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tipo: 'REFRENDO' }) }));
    expect(audit.log).toHaveBeenCalledWith(admin.id, 'EMPENO_REFRENDO', 'Empeno', 1, expect.any(String));
  });

  it('el refrendo exige periodosCubiertos', async () => {
    await expect(svc.registrarPago(1, { tipo: 'INTERES', monto: 50_000 }, admin)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cancelación correcta deja RECUPERADO con salida', async () => {
    await svc.registrarPago(1, { tipo: 'CANCELACION', monto: 1_100_000, fecha: '2026-02-10T00:00:00.000Z' }, admin);
    const data = updatesDeEmpeno()[0];
    expect(data.estado).toBe('RECUPERADO');
    expect(data.saldoCapital).toBe(0);
    expect(data.montoSalida).toBe(1_100_000);
    expect(dia(data.fechaSalida)).toBe('2026-02-10');
    expect(audit.log).toHaveBeenCalledWith(admin.id, 'EMPENO_SALIDA', 'Empeno', 1, expect.any(String));
  });

  it('el desglose del pago se guarda', async () => {
    await svc.registrarPago(1, { tipo: 'ABONO_CAPITAL', monto: 300_000, fecha: '2026-02-10T00:00:00.000Z' }, admin);
    expect(prisma.client.pagoEmpeno.update).toHaveBeenCalledWith({
      where: { id: 99 },
      data:  { interesAbonado: 100_000, capitalAbonado: 200_000, saldoCapitalDespues: 800_000 },
    });
  });

  it('cancelación con monto incorrecto → 400 y no escribe', async () => {
    await expect(svc.registrarPago(1, { tipo: 'CANCELACION', monto: 5, fecha: '2026-02-10T00:00:00.000Z' }, admin))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.client.empeno.update).not.toHaveBeenCalled();
    expect(prisma.client.pagoEmpeno.create).not.toHaveBeenCalled();
  });

  it('fecha de pago futura → 400', async () => {
    await expect(svc.registrarPago(1, { tipo: 'INTERES', monto: 50_000, periodosCubiertos: 1, fecha: '2999-01-01T00:00:00.000Z' }, admin))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('pago sobre empeño RECUPERADO → 409', async () => {
    prisma.client.empeno.findFirst.mockResolvedValue(empenoDb({ estado: 'RECUPERADO' }));
    await expect(svc.registrarPago(1, { tipo: 'INTERES', monto: 50_000, periodosCubiertos: 1 }, admin))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('cobrador no puede pagar empeño ajeno → 404', async () => {
    prisma.client.empeno.findFirst.mockResolvedValue(null);
    await expect(svc.registrarPago(1, { tipo: 'INTERES', monto: 50_000, periodosCubiertos: 1 }, cobrador))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.client.empeno.findFirst.mock.calls[0][0].where).toMatchObject({ id: 1, usuarioId: cobrador.id });
  });

  it('eliminar un abono intermedio que invalida un refrendo posterior → 400', async () => {
    prisma.client.empeno.findFirst.mockResolvedValue(empenoDb({
      fechaMaxima: new Date('2026-06-01'),
      pagos: [
        { id: 1, tipo: 'ABONO_CAPITAL', monto: 300_000, fecha: new Date('2026-02-10'), periodosCubiertos: 0 },
        { id: 2, tipo: 'INTERES',       monto: 40_000,  fecha: new Date('2026-03-05'), periodosCubiertos: 1 },
      ],
    }));
    await expect(svc.eliminarPago(1, 1, admin)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.client.pagoEmpeno.update).not.toHaveBeenCalled();
  });

  it('eliminar la cancelación reabre el empeño', async () => {
    prisma.client.empeno.findFirst.mockResolvedValue(empenoDb({
      estado: 'RECUPERADO', fechaMaxima: new Date('2099-05-01'), fechaSalida: new Date('2026-02-10'), montoSalida: 1_100_000,
      fechaIngreso: new Date(), periodosMaximos: 4,
      pagos: [{ id: 5, tipo: 'CANCELACION', monto: 1_100_000, fecha: new Date(), periodosCubiertos: 0 }],
    }));
    await svc.eliminarPago(1, 5, admin);
    expect(prisma.client.pagoEmpeno.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 5 }, data: expect.objectContaining({ deletedById: admin.id }),
    }));
    const data = updatesDeEmpeno()[0];
    expect(data.estado).toBe('ACTIVO');
    expect(data.fechaSalida).toBeNull();
    expect(data.montoSalida).toBeNull();
  });

  it('no se editan pagos de un empeño vendido → 409', async () => {
    prisma.client.empeno.findFirst.mockResolvedValue(empenoDb({
      estado: 'VENDIDO', pagos: [{ id: 1, tipo: 'INTERES', monto: 50_000, fecha: new Date('2026-01-15'), periodosCubiertos: 1 }],
    }));
    await expect(svc.editarPago(1, 1, { monto: 60_000 }, admin)).rejects.toBeInstanceOf(ConflictException);
  });

  it('salida de empeño ACTIVO → 409', async () => {
    prisma.client.empeno.findFirst.mockResolvedValue(empenoDb({ fechaMaxima: new Date('2099-01-01') }));
    await expect(svc.registrarSalida(1, { tipo: 'VENDIDO', motivo: 'Venta' }, admin)).rejects.toBeInstanceOf(ConflictException);
  });

  it('salida de empeño VENCIDO lo marca VENDIDO', async () => {
    prisma.client.empeno.findFirst.mockResolvedValue(empenoDb({ fechaMaxima: new Date('2026-05-01') }));
    await svc.registrarSalida(1, { tipo: 'VENDIDO', motivo: 'Venta', montoSalida: 1_500_000 }, admin);
    const data = updatesDeEmpeno().find((d: any) => d.estado === 'VENDIDO');
    expect(data).toMatchObject({ estado: 'VENDIDO', motivoSalida: 'Venta', montoSalida: 1_500_000 });
    expect(audit.log).toHaveBeenCalledWith(admin.id, 'EMPENO_SALIDA', 'Empeno', 1, expect.any(String));
  });

  it('liquidación a una fecha', async () => {
    const l = await svc.liquidacion(1, admin, new Date('2026-02-10'));
    expect(l.totalParaRescatar).toBe(1_100_000);
  });
});
