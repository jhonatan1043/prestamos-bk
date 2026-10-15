export type Plazo = 'DIA' | 'SEMANA' | 'MES';

/** Redondea a 2 decimales (moneda). */
export function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Suma n periodos a una fecha (en UTC). MES usa meses calendario: si el día
 * no existe en el mes destino se usa el último día de ese mes (31-ene + 1 = 28-feb).
 */
export function sumarPeriodos(fecha: Date, n: number, plazo: Plazo): Date {
  const r = new Date(fecha.getTime());
  if (plazo === 'DIA') {
    r.setUTCDate(r.getUTCDate() + n);
  } else if (plazo === 'SEMANA') {
    r.setUTCDate(r.getUTCDate() + 7 * n);
  } else {
    const dia = r.getUTCDate();
    r.setUTCDate(1);
    r.setUTCMonth(r.getUTCMonth() + n);
    const ultimo = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
    r.setUTCDate(Math.min(dia, ultimo));
  }
  return r;
}

/**
 * Cantidad de periodos iniciados entre `inicio` y `corte`: el menor n ≥ 1 tal
 * que inicio + n periodos ≥ corte.
 */
export function periodosIniciados(inicio: Date, corte: Date, plazo: Plazo): number {
  if (corte.getTime() <= inicio.getTime()) return 1;
  // Estimación cercana y ajuste exacto con sumarPeriodos
  let n: number;
  if (plazo === 'MES') {
    n = (corte.getUTCFullYear() - inicio.getUTCFullYear()) * 12 + (corte.getUTCMonth() - inicio.getUTCMonth());
  } else {
    n = Math.floor((corte.getTime() - inicio.getTime()) / ((plazo === 'DIA' ? 1 : 7) * 86_400_000));
  }
  n = Math.max(1, n);
  while (n > 1 && sumarPeriodos(inicio, n - 1, plazo).getTime() >= corte.getTime()) n--;
  while (sumarPeriodos(inicio, n, plazo).getTime() < corte.getTime()) n++;
  return n;
}
