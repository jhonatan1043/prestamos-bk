import { esFinal, estadoEfectivo, puedeRegistrarSalida } from './estado';

describe('estadoEfectivo', () => {
  it('ACTIVO pasada la fecha máxima es VENCIDO', () => {
    expect(estadoEfectivo('ACTIVO', new Date('2026-01-01'), new Date('2026-01-02'))).toBe('VENCIDO');
  });
  it('ACTIVO dentro del plazo sigue ACTIVO', () => {
    expect(estadoEfectivo('ACTIVO', new Date('2026-01-02'), new Date('2026-01-01'))).toBe('ACTIVO');
  });
  it('VENCIDO refrendado vuelve a ACTIVO', () => {
    expect(estadoEfectivo('VENCIDO', new Date('2026-05-01'), new Date('2026-04-01'))).toBe('ACTIVO');
  });
  it('RECUPERADO no cambia', () => {
    expect(estadoEfectivo('RECUPERADO', new Date('2020-01-01'), new Date())).toBe('RECUPERADO');
  });
});

describe('reglas de salida', () => {
  it('salida solo si VENCIDO', () => {
    expect(puedeRegistrarSalida('VENCIDO')).toBe(true);
    expect(puedeRegistrarSalida('ACTIVO')).toBe(false);
  });
  it('estados finales', () => {
    expect(['RECUPERADO', 'VENDIDO', 'ADJUDICADO'].every(e => esFinal(e as any))).toBe(true);
    expect(esFinal('ACTIVO')).toBe(false);
    expect(esFinal('VENCIDO')).toBe(false);
  });
});
