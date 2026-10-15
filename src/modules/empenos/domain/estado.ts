export type EstadoEmpeno = 'ACTIVO' | 'RECUPERADO' | 'VENCIDO' | 'VENDIDO' | 'ADJUDICADO';

const FINALES = new Set<EstadoEmpeno>(['RECUPERADO', 'VENDIDO', 'ADJUDICADO']);

/** El artículo ya salió (rescatado, vendido o adjudicado): no admite más operaciones. */
export function esFinal(estado: EstadoEmpeno): boolean {
  return FINALES.has(estado);
}

/** Estado real a una fecha: ACTIVO pasa a VENCIDO al superar la fecha máxima y vuelve con un refrendo. */
export function estadoEfectivo(estado: EstadoEmpeno, fechaMaxima: Date, ahora: Date): EstadoEmpeno {
  if (esFinal(estado)) return estado;
  return ahora.getTime() > fechaMaxima.getTime() ? 'VENCIDO' : 'ACTIVO';
}

/** Solo un empeño vencido puede salir por venta o adjudicación. */
export function puedeRegistrarSalida(estadoEf: EstadoEmpeno): boolean {
  return estadoEf === 'VENCIDO';
}
