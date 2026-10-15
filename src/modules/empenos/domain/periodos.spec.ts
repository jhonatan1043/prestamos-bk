import { periodosIniciados, sumarPeriodos } from './periodos';

const dia = (d: Date) => d.toISOString().slice(0, 10);

describe('sumarPeriodos', () => {
  it('MES respeta fin de mes', () => {
    expect(dia(sumarPeriodos(new Date('2026-01-31T12:00:00Z'), 1, 'MES'))).toBe('2026-02-28');
    expect(dia(sumarPeriodos(new Date('2028-01-31T12:00:00Z'), 1, 'MES'))).toBe('2028-02-29');
  });

  it('MES de varios periodos parte siempre del día original', () => {
    expect(dia(sumarPeriodos(new Date('2026-01-31T12:00:00Z'), 2, 'MES'))).toBe('2026-03-31');
  });

  it('usa la hora de Colombia: 30-abr 20:00 + 1 mes = 30-may 20:00 (no 31)', () => {
    // 2026-05-01T01:00Z es 30-abr 20:00 en Bogotá (UTC-5)
    expect(sumarPeriodos(new Date('2026-05-01T01:00:00Z'), 1, 'MES').toISOString()).toBe('2026-05-31T01:00:00.000Z');
  });

  it('usa la hora de Colombia: 28-feb 20:00 + 1 mes = 28-mar 20:00', () => {
    expect(sumarPeriodos(new Date('2026-03-01T01:00:00Z'), 1, 'MES').toISOString()).toBe('2026-03-29T01:00:00.000Z');
  });

  it('DIA y SEMANA', () => {
    expect(dia(sumarPeriodos(new Date('2026-01-01'), 3, 'DIA'))).toBe('2026-01-04');
    expect(dia(sumarPeriodos(new Date('2026-01-01'), 2, 'SEMANA'))).toBe('2026-01-15');
  });
});

describe('periodosIniciados', () => {
  it('40 días en MES = 2', () => {
    expect(periodosIniciados(new Date('2026-01-01'), new Date('2026-02-10'), 'MES')).toBe(2);
  });

  it('el mismo día del ingreso cuenta 1 periodo', () => {
    expect(periodosIniciados(new Date('2026-01-01'), new Date('2026-01-01'), 'MES')).toBe(1);
  });

  it('justo al cumplir el periodo sigue siendo 1', () => {
    expect(periodosIniciados(new Date('2026-01-01'), new Date('2026-02-01'), 'MES')).toBe(1);
  });

  it('SEMANA y DIA', () => {
    expect(periodosIniciados(new Date('2026-01-01'), new Date('2026-01-09'), 'SEMANA')).toBe(2);
    expect(periodosIniciados(new Date('2026-01-01'), new Date('2026-01-04'), 'DIA')).toBe(3);
  });
});
