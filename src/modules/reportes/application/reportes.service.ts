import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/tenant/tenant-prisma.service';

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: TenantPrismaService) {}

  // ─── Utilidades privadas ─────────────────────────────────────────────────

  /** Calcula el interés total esperado de un préstamo (interés simple sobre el capital) */
  private calcularInteresTotalEsperado(monto: number, tasa: number, plazoDias: number, tipoPlazo: string): number {
    // Convertir plazo a días equivalentes
    let diasEquivalentes = plazoDias;
    if (tipoPlazo === 'SEMANA') diasEquivalentes = plazoDias * 7;
    if (tipoPlazo === 'MES')    diasEquivalentes = plazoDias * 30;
    // Interés simple: capital × tasa% × días / 365
    return monto * (tasa / 100) * (diasEquivalentes / 365);
  }

  /** Calcula días en mora desde la fecha límite */
  private calcularDiasEnMora(fechaInicio: Date, plazoDias: number, tipoPlazo: string): number {
    const hoy = new Date();
    const fechaLimite = new Date(fechaInicio);
    if      (tipoPlazo === 'DIA')    fechaLimite.setDate(fechaLimite.getDate() + plazoDias);
    else if (tipoPlazo === 'SEMANA') fechaLimite.setDate(fechaLimite.getDate() + plazoDias * 7);
    else if (tipoPlazo === 'MES')    fechaLimite.setMonth(fechaLimite.getMonth() + plazoDias);
    if (hoy <= fechaLimite) return 0;
    return Math.floor((hoy.getTime() - fechaLimite.getTime()) / 86_400_000);
  }

  // ─── Estado de Resultados (P&L mensual) ──────────────────────────────────

  /**
   * Genera el estado de resultados para un mes específico.
   *  - Ingresos por intereses: estimados sobre préstamos activos / calculados sobre cancelados
   *  - Capital recuperado: pagos registrados en el período
   *  - Gastos: gastos registrados en el período
   */
  async estadoResultados(year: number, month: number) {
    const inicio = new Date(year, month - 1, 1);
    const fin    = new Date(year, month,     1);

    // ── Pagos del período ─────────────────────────────────────────────────
    const pagos = await this.prisma.pago.findMany({
      where:   { fecha: { gte: inicio, lt: fin } },
      include: { prestamo: true },
    });

    const totalCobrado     = pagos.reduce((s, p) => s + Number(p.monto), 0);
    const capitalCobrado   = pagos.reduce((s, p) => s + Number((p as any).capitalAbonado ?? 0), 0);
    const interesCobrado   = pagos.reduce((s, p) => s + Number((p as any).interesAbonado ?? 0), 0);

    // Si no hay desglose almacenado, estimar intereses (20% del cobrado como proxy)
    const interesEstimado  = interesCobrado > 0 ? interesCobrado : totalCobrado * 0.2;

    // ── Gastos del período ────────────────────────────────────────────────
    const gastos = await this.prisma.gasto.findMany({
      where: { fecha: { gte: inicio, lt: fin }, active: true },
    });

    const totalGastos = gastos.reduce((s, g) => s + Number(g.monto), 0);

    // Gastos por categoría
    const gastosPorCategoria: Record<string, number> = {};
    for (const g of gastos) {
      const cat = (g as any).categoria ?? 'OTROS';
      gastosPorCategoria[cat] = (gastosPorCategoria[cat] ?? 0) + Number(g.monto);
    }

    // ── Préstamos desembolsados en el período ─────────────────────────────
    const prestamosDesembolsados = await this.prisma.prestamo.findMany({
      where: { fechaInicio: { gte: inicio, lt: fin } },
    });
    const totalDesembolsado = prestamosDesembolsados.reduce((s, p) => s + Number(p.monto), 0);

    // ── Interés proyectado de préstamos activos (acumulado hasta fin de mes) ─
    const prestamosActivos = await this.prisma.prestamo.findMany({
      where:   { estado: { nombre: 'ACTIVO' } },
      include: { pagos: true },
    });
    const interesProyectadoActivos = prestamosActivos.reduce((s, p) => {
      return s + this.calcularInteresTotalEsperado(Number(p.monto), p.tasa, p.plazoDias, p.tipoPlazo);
    }, 0);

    return {
      periodo: { year, month, label: `${year}-${String(month).padStart(2, '0')}` },
      ingresos: {
        capitalCobrado,
        interesCobrado:        interesCobrado > 0 ? interesCobrado : null,
        interesEstimado,       // proxy cuando no hay desglose
        totalCobrado,
        interesProyectadoCarteraActiva: interesProyectadoActivos,
      },
      egresos: {
        totalDesembolsado,
        totalGastos,
        gastosPorCategoria,
      },
      utilidad: {
        brutaEstimada:   interesEstimado - totalGastos,
        flujoNeto:       totalCobrado - totalDesembolsado - totalGastos,
      },
    };
  }

  /** Retorna el P&L de los últimos N meses */
  async estadoResultadosMultiperiodo(meses = 6) {
    const hoy       = new Date();
    const resultados: any[] = [];
    for (let i = meses - 1; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      resultados.push(await this.estadoResultados(d.getFullYear(), d.getMonth() + 1));
    }
    return resultados;
  }

  // ─── Dashboard de cartera (calidad) ──────────────────────────────────────

  async dashboardCartera() {
    const prestamos = await this.prisma.prestamo.findMany({
      where:   { estado: { nombre: { in: ['ACTIVO', 'EN_MORA', 'JURIDICO'] } } },
      include: { pagos: true, cliente: true },
    });

    const hoy = new Date();

    let carteraVigente    = 0;
    let carteraEnMora     = 0;
    let par30             = 0;
    let par60             = 0;
    let par90             = 0;
    let totalDesembolsado = 0;
    let totalCobrado      = 0;

    const detalleMora: any[] = [];

    for (const p of prestamos) {
      const capital    = Number(p.monto);
      const cobrado    = p.pagos.reduce((s, pg) => s + Number(pg.monto), 0);
      const saldo      = Math.max(0, capital - cobrado);
      const diasMora   = this.calcularDiasEnMora(p.fechaInicio, p.plazoDias, p.tipoPlazo);
      const interes    = this.calcularInteresTotalEsperado(capital, p.tasa, p.plazoDias, p.tipoPlazo);

      totalDesembolsado += capital;
      totalCobrado      += cobrado;

      if (saldo <= 0) continue; // saldado

      if (diasMora === 0) {
        carteraVigente += saldo;
      } else {
        carteraEnMora += saldo;
        if (diasMora >= 30) par30 += saldo;
        if (diasMora >= 60) par60 += saldo;
        if (diasMora >= 90) par90 += saldo;

        detalleMora.push({
          prestamoId:    p.id,
          cliente:       `${p.cliente.nombres} ${p.cliente.apellidos}`,
          capital,
          saldoPendiente: saldo,
          diasMora,
          interesEstimado: interes,
          etapa: diasMora >= 90 ? 'JURIDICO' : diasMora >= 60 ? 'PREJURIDICO' : diasMora >= 30 ? 'MORA_GRAVE' : 'MORA_TEMPRANA',
        });
      }
    }

    const carteraTotal        = carteraVigente + carteraEnMora;
    const tasaRecuperacion    = totalDesembolsado > 0 ? (totalCobrado / totalDesembolsado) * 100 : 0;
    const indicePAR30         = carteraTotal > 0 ? (par30 / carteraTotal) * 100 : 0;
    const indicePAR60         = carteraTotal > 0 ? (par60 / carteraTotal) * 100 : 0;
    const indicePAR90         = carteraTotal > 0 ? (par90 / carteraTotal) * 100 : 0;

    return {
      resumen: {
        totalDesembolsado,
        totalCobrado,
        carteraTotal,
        carteraVigente,
        carteraEnMora,
        tasaRecuperacion:   Math.round(tasaRecuperacion * 100) / 100,
      },
      indicadores: {
        par30,   indicePAR30: Math.round(indicePAR30 * 100) / 100,
        par60,   indicePAR60: Math.round(indicePAR60 * 100) / 100,
        par90,   indicePAR90: Math.round(indicePAR90 * 100) / 100,
      },
      detalleMora: detalleMora.sort((a, b) => b.diasMora - a.diasMora),
      fechaCorte: hoy.toISOString(),
    };
  }

  // ─── Rentabilidad por ruta ───────────────────────────────────────────────

  async rentabilidadRutas() {
    const rutas = await this.prisma.ruta.findMany({
      include: {
        clientes: {
          include: {
            cliente: {
              include: {
                prestamos: { include: { pagos: true } },
              },
            },
          },
        },
      },
    });

    return rutas.map(ruta => {
      let capitalInvertido = 0;
      let totalCobrado     = 0;
      let saldoPendiente   = 0;
      let prestamosActivos = 0;
      let prestamosEnMora  = 0;

      for (const cr of (ruta as any).clientes) {
        for (const prestamo of cr.cliente.prestamos) {
          const capital = Number(prestamo.monto);
          const cobrado = prestamo.pagos.reduce((s, p) => s + Number(p.monto), 0);
          const saldo   = Math.max(0, capital - cobrado);
          const mora    = this.calcularDiasEnMora(prestamo.fechaInicio, prestamo.plazoDias, prestamo.tipoPlazo);

          capitalInvertido += capital;
          totalCobrado     += cobrado;
          saldoPendiente   += saldo;
          if (saldo > 0) prestamosActivos++;
          if (mora > 0 && saldo > 0) prestamosEnMora++;
        }
      }

      const interesTotalEsperado = capitalInvertido * 0.2; // estimado 20% promedio
      const utilidadEstimada     = totalCobrado - capitalInvertido;
      const roi                  = capitalInvertido > 0 ? (utilidadEstimada / capitalInvertido) * 100 : 0;

      return {
        rutaId:   ruta.id,
        nombre:   ruta.nombre,
        capitalInvertido,
        totalCobrado,
        saldoPendiente,
        utilidadEstimada,
        roi: Math.round(roi * 100) / 100,
        prestamosActivos,
        prestamosEnMora,
        tasaMora: prestamosActivos > 0 ? Math.round((prestamosEnMora / prestamosActivos) * 100 * 100) / 100 : 0,
      };
    });
  }
}
