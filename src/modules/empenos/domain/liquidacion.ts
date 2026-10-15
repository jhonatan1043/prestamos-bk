import { Plazo, periodosIniciados, redondear, sumarPeriodos } from './periodos';

export interface DatosEmpeno {
  montoPrestado:   number;
  tasa:            number;
  tipoPlazo:       Plazo;
  periodosMinimos: number;
  periodosMaximos: number;
  fechaIngreso:    Date;
}

export type TipoPago = 'INTERES' | 'ABONO_CAPITAL' | 'CANCELACION';

export interface PagoParaReplay {
  id?:               number;
  tipo:              TipoPago;
  monto:             number;
  fecha:             Date;
  periodosCubiertos: number;
}

export interface DesglosePago {
  id?:                 number;
  interesAbonado:      number;
  capitalAbonado:      number;
  saldoCapitalDespues: number;
}

export interface EstadoCalculado {
  saldoCapital:    number;
  periodosPagados: number;
  fechaMaxima:     Date;
  cancelado:       boolean;
  /** Fecha del pago de cancelación, si existe */
  fechaCancelacion?: Date;
  desglose:        DesglosePago[];
}

export interface Liquidacion {
  periodosTranscurridos: number;
  periodosAdeudados:     number;
  interesPorPeriodo:     number;
  interesAdeudado:       number;
  saldoCapital:          number;
  totalParaRescatar:     number;
  fechaMinima:           Date;
  fechaMaxima:           Date;
}

/** Pago inválido para el estado del empeño (monto o periodos que no cuadran). */
export class ErrorLiquidacion extends Error {}

const fmt = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 2 });

/**
 * Reconstruye saldo, periodos pagados y fecha máxima reproduciendo los pagos
 * en orden (fecha, id). Lanza ErrorLiquidacion si algún pago no es válido.
 */
export function reconstruirEstado(e: DatosEmpeno, pagos: PagoParaReplay[]): EstadoCalculado {
  const ordenados = [...pagos].sort(
    (a, b) => a.fecha.getTime() - b.fecha.getTime() || (a.id ?? 0) - (b.id ?? 0),
  );

  let saldo      = redondear(e.montoPrestado);
  let pagados    = 0;
  let refrendados = 0;
  let cancelado  = false;
  let fechaCancelacion: Date | undefined;
  const desglose: DesglosePago[] = [];

  for (const p of ordenados) {
    if (cancelado) throw new ErrorLiquidacion('No se pueden registrar pagos después del rescate del artículo');

    const interesPeriodo = redondear(saldo * e.tasa / 100);
    const iniciados      = periodosIniciados(e.fechaIngreso, p.fecha, e.tipoPlazo);
    const adeudados      = Math.max(iniciados - pagados, 0);
    const monto          = redondear(p.monto);

    if (p.tipo === 'INTERES') {
      const minimo = Math.max(adeudados, 1);
      if (!Number.isInteger(p.periodosCubiertos) || p.periodosCubiertos < minimo) {
        throw new ErrorLiquidacion(`El refrendo debe cubrir al menos ${minimo} periodo(s)`);
      }
      const esperado = redondear(p.periodosCubiertos * interesPeriodo);
      if (monto !== esperado) {
        throw new ErrorLiquidacion(`El refrendo de ${p.periodosCubiertos} periodo(s) debe ser de ${fmt(esperado)}`);
      }
      pagados     += p.periodosCubiertos;
      refrendados += p.periodosCubiertos;
      desglose.push({ id: p.id, interesAbonado: monto, capitalAbonado: 0, saldoCapitalDespues: saldo });
    } else if (p.tipo === 'ABONO_CAPITAL') {
      const interes = redondear(adeudados * interesPeriodo);
      const capital = redondear(monto - interes);
      if (capital <= 0) {
        throw new ErrorLiquidacion(`El abono debe ser mayor al interés pendiente (${fmt(interes)})`);
      }
      if (capital >= saldo) {
        throw new ErrorLiquidacion('El abono cubre todo el capital: registra el rescate (cancelación) del artículo');
      }
      pagados = Math.max(pagados, iniciados);
      saldo   = redondear(saldo - capital);
      desglose.push({ id: p.id, interesAbonado: interes, capitalAbonado: capital, saldoCapitalDespues: saldo });
    } else {
      const aCobrar  = Math.max(adeudados, e.periodosMinimos - pagados, 0);
      const interes  = redondear(aCobrar * interesPeriodo);
      const esperado = redondear(saldo + interes);
      if (monto !== esperado) {
        throw new ErrorLiquidacion(`El rescate debe ser de ${fmt(esperado)}`);
      }
      desglose.push({ id: p.id, interesAbonado: interes, capitalAbonado: saldo, saldoCapitalDespues: 0 });
      pagados += aCobrar;
      saldo    = 0;
      cancelado = true;
      fechaCancelacion = p.fecha;
    }
  }

  return {
    saldoCapital:    saldo,
    periodosPagados: pagados,
    fechaMaxima:     sumarPeriodos(e.fechaIngreso, e.periodosMaximos + refrendados, e.tipoPlazo),
    cancelado,
    fechaCancelacion,
    desglose,
  };
}

/** Liquidación del empeño a una fecha de corte (interés adeudado y total para rescatar). */
export function liquidar(e: DatosEmpeno, estado: EstadoCalculado, corte: Date): Liquidacion {
  const interesPorPeriodo     = redondear(estado.saldoCapital * e.tasa / 100);
  const periodosTranscurridos = periodosIniciados(e.fechaIngreso, corte, e.tipoPlazo);
  const periodosAdeudados     = estado.cancelado ? 0 : Math.max(periodosTranscurridos - estado.periodosPagados, 0);
  const aCobrar               = estado.cancelado ? 0 : Math.max(periodosAdeudados, e.periodosMinimos - estado.periodosPagados, 0);

  return {
    periodosTranscurridos,
    periodosAdeudados,
    interesPorPeriodo,
    // Interés vencido a la fecha; el mínimo de periodos solo aplica al rescate
    interesAdeudado:   redondear(periodosAdeudados * interesPorPeriodo),
    saldoCapital:      estado.saldoCapital,
    totalParaRescatar: redondear(estado.saldoCapital + aCobrar * interesPorPeriodo),
    fechaMinima:       sumarPeriodos(e.fechaIngreso, e.periodosMinimos, e.tipoPlazo),
    fechaMaxima:       estado.fechaMaxima,
  };
}
