import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EmpenosService } from './empenos.service';
import { EmpenoReportesService } from './empeno-reportes.service';
import { admin, cobrador, crearPrismaFalso, empenoDb } from './testing/fake-prisma';

describe('EmpenoReportesService', () => {
  let prisma: any;
  let svc: EmpenoReportesService;

  // A los 40 días del ingreso: el primero debe 2 meses (100.000); el segundo, con abono, 1 mes de 40.000
  const hace40Dias = new Date(Date.now() - 40 * 86_400_000);
  const empenoSinPagos = () => empenoDb({ id: 1, fechaIngreso: hace40Dias, fechaMaxima: new Date('2099-01-01') });
  const empenoConAbono = () => empenoDb({
    id: 2, fechaIngreso: hace40Dias, fechaMaxima: new Date('2099-01-01'), saldoCapital: 800_000,
    // Día 20: cubre el 1.er mes (50.000) y abona 200.000 → saldo 800.000
    pagos: [{ id: 1, tipo: 'ABONO_CAPITAL', monto: 250_000, fecha: new Date(hace40Dias.getTime() + 20 * 86_400_000), periodosCubiertos: 0 }],
  });

  beforeEach(() => {
    prisma = crearPrismaFalso();
    svc = new EmpenoReportesService(prisma, new EmpenosService(prisma, { log: jest.fn() } as any));
  });

  it('resumen de un cobrador solo consulta lo suyo', async () => {
    await svc.resumen(cobrador);
    for (const call of prisma.client.empeno.findMany.mock.calls) {
      expect(call[0].where).toMatchObject({ usuarioId: cobrador.id, deletedAt: null });
    }
    expect(prisma.client.empeno.findMany).toHaveBeenCalled();
  });

  it('interesPorCobrar suma las liquidaciones', async () => {
    prisma.client.empeno.findMany.mockResolvedValueOnce([empenoSinPagos(), empenoConAbono()]);
    const r = await svc.resumen(admin);
    expect(r.interesPorCobrar).toBe(140_000);
    expect(r.capitalPrestado).toBe(1_800_000);
    expect(r.activos).toBe(2);
  });

  it('por cliente devuelve totales', async () => {
    prisma.client.cliente.findFirst.mockResolvedValue({ id: 10, nombres: 'Ana', apellidos: 'Pérez', identificacion: '123' });
    prisma.client.empeno.findMany.mockResolvedValueOnce([empenoSinPagos()]);
    const r = await svc.porCliente(10, admin);
    expect(r.totales).toEqual({ activos: 1, saldoCapital: 1_000_000, interesAdeudado: 100_000, totalParaRescatar: 1_100_000 });
  });

  it('por cliente inexistente → 404', async () => {
    await expect(svc.porCliente(99, admin)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('movimientos con rango mayor a 366 días → 400', async () => {
    await expect(svc.movimientos({ desde: new Date('2025-01-01'), hasta: new Date('2026-02-05') }, admin))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('movimientos de un cobrador filtra por sus empeños', async () => {
    await svc.movimientos({ desde: new Date('2026-01-01'), hasta: new Date('2026-01-31') }, cobrador);
    const where = prisma.client.movimientoEmpeno.findMany.mock.calls[0][0].where;
    expect(where.empeno).toMatchObject({ usuarioId: cobrador.id, deletedAt: null });
    expect(where.fecha).toEqual({ gte: new Date('2026-01-01'), lte: new Date('2026-01-31') });
  });
});
