import { DatosEmpeno, EstadoCalculado, Liquidacion, PagoParaReplay, liquidar, reconstruirEstado } from '../domain/liquidacion';
import { EstadoEmpeno, estadoEfectivo } from '../domain/estado';
import { Plazo } from '../domain/periodos';

/** Convierte valores Decimal/string de Prisma a number. */
export const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));

/** Condiciones del empeño a partir de la fila de Prisma. */
export function datosDe(e: any): DatosEmpeno {
  return {
    montoPrestado:   num(e.montoPrestado),
    tasa:            Number(e.tasa),
    tipoPlazo:       e.tipoPlazo as Plazo,
    periodosMinimos: e.periodosMinimos,
    periodosMaximos: e.periodosMaximos,
    fechaIngreso:    new Date(e.fechaIngreso),
  };
}

/** Pagos no eliminados en el formato del cálculo. */
export function pagosDe(e: any): PagoParaReplay[] {
  return (e.pagos ?? [])
    .filter((p: any) => !p.deletedAt)
    .map((p: any) => ({
      id:                p.id,
      tipo:              p.tipo,
      monto:             num(p.monto),
      fecha:             new Date(p.fecha),
      periodosCubiertos: p.periodosCubiertos ?? 0,
    }));
}

/** Estado actual (saldo, periodos pagados, fecha máxima) reproduciendo los pagos. */
export function estadoDe(e: any): EstadoCalculado {
  return reconstruirEstado(datosDe(e), pagosDe(e));
}

/** Liquidación a una fecha. */
export function liquidacionDe(e: any, corte = new Date()): Liquidacion {
  return liquidar(datosDe(e), estadoDe(e), corte);
}

/** Estado efectivo (ACTIVO/VENCIDO según la fecha máxima). */
export function estadoActual(e: any, ahora = new Date()): EstadoEmpeno {
  return estadoEfectivo(e.estado, new Date(e.fechaMaxima), ahora);
}

/** Fila para listados. */
export function aResumen(e: any) {
  return {
    id:             e.id,
    codigo:         e.codigo,
    tipoArticulo:   e.tipoArticulo,
    estado:         e.deletedAt ? e.estado : estadoActual(e),
    eliminado:      !!e.deletedAt,
    montoPrestado:  num(e.montoPrestado),
    saldoCapital:   num(e.saldoCapital),
    tasa:           Number(e.tasa),
    tipoPlazo:      e.tipoPlazo,
    fechaIngreso:   e.fechaIngreso,
    fechaMinima:    e.fechaMinima,
    fechaMaxima:    e.fechaMaxima,
    fechaSalida:    e.fechaSalida,
    usuarioId:      e.usuarioId,
    cliente:        e.cliente,
    articulo:       e.articulo,
  };
}

/** Detalle completo con liquidación a hoy. */
export function aDetalle(e: any) {
  const pagos = (e.pagos ?? []).filter((p: any) => !p.deletedAt);
  return {
    ...aResumen(e),
    periodosMinimos: e.periodosMinimos,
    periodosMaximos: e.periodosMaximos,
    periodosPagados: e.periodosPagados,
    motivoSalida:    e.motivoSalida,
    montoSalida:     e.montoSalida === null || e.montoSalida === undefined ? null : num(e.montoSalida),
    codigoConsulta:  e.codigoConsulta,
    notas:           e.notas,
    usuario:         e.usuario,
    deletedAt:       e.deletedAt,
    pagos: pagos.map((p: any) => ({
      id:                  p.id,
      fecha:               p.fecha,
      tipo:                p.tipo,
      monto:               num(p.monto),
      interesAbonado:      num(p.interesAbonado),
      capitalAbonado:      num(p.capitalAbonado),
      saldoCapitalDespues: num(p.saldoCapitalDespues),
      periodosCubiertos:   p.periodosCubiertos,
      usuarioId:           p.usuarioId,
    })),
    movimientos: (e.movimientos ?? []).map((m: any) => ({
      id: m.id, fecha: m.fecha, tipo: m.tipo, detalle: m.detalle, usuario: m.usuario,
    })),
    liquidacion: e.deletedAt ? null : liquidacionDe(e),
  };
}
