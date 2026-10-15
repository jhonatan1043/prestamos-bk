export type Plazo = 'DIA' | 'SEMANA' | 'MES';

/** Redondea a 2 decimales (moneda). */
export function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Desfase del negocio respecto a UTC en minutos (Colombia: -300, sin horario de verano).
 * Los meses y días se cuentan en la hora local del negocio, no en UTC: un ingreso a
 * las 20:00 del 30-abr en Bogotá ya es 1-may en UTC.
 */
function desfaseNegocioMs(): number {
  const min = Number(process.env.TZ_OFFSET_MINUTES ?? -300);
  return (Number.isFinite(min) ? min : -300) * 60_000;
}

/**
 * Suma n periodos a una fecha (en la hora local del negocio). MES usa meses calendario:
 * si el día no existe en el mes destino se usa el último día de ese mes (31-ene + 1 = 28-feb).
 */
export function sumarPeriodos(fecha: Date, n: number, plazo: Plazo): Date {
  const desfase = desfaseNegocioMs();
  // Se trabaja con métodos UTC sobre la fecha desplazada a la hora del negocio
  const r = new Date(fecha.getTime() + desfase);
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
  return new Date(r.getTime() - desfase);
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
    // Estimación aproximada; el ajuste exacto lo hacen los bucles con sumarPeriodos
    n = (corte.getUTCFullYear() - inicio.getUTCFullYear()) * 12 + (corte.getUTCMonth() - inicio.getUTCMonth());
  } else {
    n = Math.floor((corte.getTime() - inicio.getTime()) / ((plazo === 'DIA' ? 1 : 7) * 86_400_000));
  }
  n = Math.max(1, n);
  while (n > 1 && sumarPeriodos(inicio, n - 1, plazo).getTime() >= corte.getTime()) n--;
  while (sumarPeriodos(inicio, n, plazo).getTime() < corte.getTime()) n++;
  return n;
}
