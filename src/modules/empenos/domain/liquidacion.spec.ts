import { DatosEmpeno, ErrorLiquidacion, liquidar, reconstruirEstado } from './liquidacion';

const dia = (d: Date) => d.toISOString().slice(0, 10);

// 1.000.000 al 5 % mensual, mínimo 2, máximo 4, ingreso 2026-01-01
const base: DatosEmpeno = {
  montoPrestado: 1_000_000, tasa: 5, tipoPlazo: 'MES',
  periodosMinimos: 2, periodosMaximos: 4, fechaIngreso: new Date('2026-01-01'),
};

describe('liquidar', () => {
  it('a los 40 días debe 2 meses: 100.000', () => {
    const l = liquidar(base, reconstruirEstado(base, []), new Date('2026-02-10'));
    expect(l.interesAdeudado).toBe(100_000);
    expect(l.totalParaRescatar).toBe(1_100_000);
    expect(l.periodosAdeudados).toBe(2);
  });

  it('rescate a los 10 días cobra el mínimo (2 periodos)', () => {
    const l = liquidar(base, reconstruirEstado(base, []), new Date('2026-01-11'));
    expect(l.interesAdeudado).toBe(50_000);
    expect(l.totalParaRescatar).toBe(1_100_000);
  });

  it('calcula fechas mínima y máxima', () => {
    const l = liquidar(base, reconstruirEstado(base, []), new Date('2026-01-11'));
    expect(dia(l.fechaMinima)).toBe('2026-03-01');
    expect(dia(l.fechaMaxima)).toBe('2026-05-01');
  });
});

describe('reconstruirEstado', () => {
  it('refrendo de 1 periodo corre la fecha máxima 1 mes', () => {
    const e = reconstruirEstado(base, [{ tipo: 'INTERES', monto: 50_000, fecha: new Date('2026-01-15'), periodosCubiertos: 1 }]);
    expect(dia(e.fechaMaxima)).toBe('2026-06-01');
    expect(e.periodosPagados).toBe(1);
    expect(e.desglose[0]).toEqual({ id: undefined, interesAbonado: 50_000, capitalAbonado: 0, saldoCapitalDespues: 1_000_000 });
  });

  it('abono cubre interés vencido y baja capital', () => {
    const e = reconstruirEstado(base, [{ tipo: 'ABONO_CAPITAL', monto: 300_000, fecha: new Date('2026-02-10'), periodosCubiertos: 0 }]);
    expect(e.desglose[0]).toEqual({ id: undefined, interesAbonado: 100_000, capitalAbonado: 200_000, saldoCapitalDespues: 800_000 });
    expect(liquidar(base, e, new Date('2026-03-05')).interesPorPeriodo).toBe(40_000);
  });

  it('cancelación correcta deja saldo 0 y cancelado', () => {
    const e = reconstruirEstado(base, [{ tipo: 'CANCELACION', monto: 1_100_000, fecha: new Date('2026-02-10'), periodosCubiertos: 0 }]);
    expect(e.cancelado).toBe(true);
    expect(e.saldoCapital).toBe(0);
  });

  it('cancelación con monto incorrecto lanza ErrorLiquidacion', () => {
    expect(() => reconstruirEstado(base, [{ tipo: 'CANCELACION', monto: 1_000_000, fecha: new Date('2026-01-05'), periodosCubiertos: 0 }])).toThrow(ErrorLiquidacion);
  });

  it('no admite pagos después de una cancelación', () => {
    expect(() => reconstruirEstado(base, [
      { tipo: 'CANCELACION', monto: 1_100_000, fecha: new Date('2026-01-05'), periodosCubiertos: 0 },
      { tipo: 'INTERES', monto: 50_000, fecha: new Date('2026-01-06'), periodosCubiertos: 1 },
    ])).toThrow(ErrorLiquidacion);
  });

  it('refrendo que no cubre lo adeudado lanza error', () => {
    expect(() => reconstruirEstado(base, [{ tipo: 'INTERES', monto: 50_000, fecha: new Date('2026-03-15'), periodosCubiertos: 1 }])).toThrow(ErrorLiquidacion);
  });

  it('abono que no supera el interés adeudado lanza error', () => {
    expect(() => reconstruirEstado(base, [{ tipo: 'ABONO_CAPITAL', monto: 100_000, fecha: new Date('2026-02-10'), periodosCubiertos: 0 }])).toThrow(ErrorLiquidacion);
  });

  it('abono que liquida todo el capital debe hacerse como cancelación', () => {
    expect(() => reconstruirEstado(base, [{ tipo: 'ABONO_CAPITAL', monto: 1_100_000, fecha: new Date('2026-02-10'), periodosCubiertos: 0 }])).toThrow(ErrorLiquidacion);
  });

  it('procesa los pagos en orden de fecha aunque lleguen desordenados', () => {
    const e = reconstruirEstado(base, [
      { id: 2, tipo: 'INTERES', monto: 40_000, fecha: new Date('2026-03-05'), periodosCubiertos: 1 },
      { id: 1, tipo: 'ABONO_CAPITAL', monto: 300_000, fecha: new Date('2026-02-10'), periodosCubiertos: 0 },
    ]);
    expect(e.periodosPagados).toBe(3);
    expect(e.desglose.map(d => d.id)).toEqual([1, 2]);
  });
});
