import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/tenant/tenant-prisma.service';
import { redondear } from '../domain/periodos';
import { aResumen, estadoActual, liquidacionDe, num } from './empeno-calculo';
import { Actor, EmpenosService, INCLUDE_LISTA, TipoMovimiento } from './empenos.service';

const DIA_MS = 86_400_000;
const INCLUDE_CALCULO = { ...INCLUDE_LISTA, pagos: { where: { deletedAt: null } } };

@Injectable()
export class EmpenoReportesService {
  constructor(
    private readonly prisma:  TenantPrismaService,
    private readonly empenos: EmpenosService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  async resumen(actor: Actor) {
    const ahora     = new Date();
    const inicioMes = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1));
    const visible   = this.empenos.whereVisible(actor);

    const vigentes = await this.db.empeno.findMany({
      where:   { ...visible, estado: { in: ['ACTIVO', 'VENCIDO'] } },
      include: INCLUDE_CALCULO,
    });
    const salidasMes = await this.db.empeno.findMany({
      where:  { ...visible, estado: { in: ['RECUPERADO', 'VENDIDO', 'ADJUDICADO'] }, fechaSalida: { gte: inicioMes } },
      select: { estado: true },
    });

    let activos = 0, vencidos = 0, porVencer7Dias = 0, capitalPrestado = 0, interesPorCobrar = 0;
    const limite7 = ahora.getTime() + 7 * DIA_MS;
    for (const e of vigentes) {
      const estado = estadoActual(e, ahora);
      if (estado === 'VENCIDO') vencidos++;
      else {
        activos++;
        if (new Date(e.fechaMaxima).getTime() <= limite7) porVencer7Dias++;
      }
      capitalPrestado  += num(e.saldoCapital);
      interesPorCobrar += liquidacionDe(e, ahora).interesAdeudado;
    }

    return {
      activos, vencidos, porVencer7Dias,
      capitalPrestado:  redondear(capitalPrestado),
      interesPorCobrar: redondear(interesPorCobrar),
      recuperadosMes:   salidasMes.filter(s => s.estado === 'RECUPERADO').length,
      vendidosMes:      salidasMes.filter(s => s.estado !== 'RECUPERADO').length,
    };
  }

  async porCliente(clienteId: number, actor: Actor) {
    const cliente = await this.db.cliente.findFirst({
      where:  { id: clienteId },
      select: { id: true, nombres: true, apellidos: true, identificacion: true, telefono: true },
    });
    if (!cliente) throw new NotFoundException(`Cliente #${clienteId} no encontrado`);

    const lista = await this.db.empeno.findMany({
      where:   { ...this.empenos.whereVisible(actor), clienteId },
      include: INCLUDE_CALCULO,
      orderBy: { fechaIngreso: 'desc' },
    });

    const totales = { activos: 0, saldoCapital: 0, interesAdeudado: 0, totalParaRescatar: 0 };
    const empenos = lista.map(e => {
      const item = aResumen(e);
      if (item.estado === 'ACTIVO' || item.estado === 'VENCIDO') {
        const l = liquidacionDe(e);
        totales.activos++;
        totales.saldoCapital      += l.saldoCapital;
        totales.interesAdeudado   += l.interesAdeudado;
        totales.totalParaRescatar += l.totalParaRescatar;
        return { ...item, interesAdeudado: l.interesAdeudado, totalParaRescatar: l.totalParaRescatar };
      }
      return { ...item, interesAdeudado: 0, totalParaRescatar: 0 };
    });

    return {
      cliente,
      empenos,
      totales: {
        activos:           totales.activos,
        saldoCapital:      redondear(totales.saldoCapital),
        interesAdeudado:   redondear(totales.interesAdeudado),
        totalParaRescatar: redondear(totales.totalParaRescatar),
      },
    };
  }

  async movimientos(filtros: { desde: Date; hasta: Date; tipo?: TipoMovimiento }, actor: Actor) {
    const { desde, hasta } = filtros;
    if (hasta.getTime() < desde.getTime()) throw new BadRequestException('La fecha "hasta" debe ser posterior a "desde"');
    if (hasta.getTime() - desde.getTime() > 366 * DIA_MS) throw new BadRequestException('El rango máximo es de 366 días');

    const movimientos = await this.db.movimientoEmpeno.findMany({
      where: {
        fecha:  { gte: desde, lte: hasta },
        // El admin también ve los de empeños eliminados (reporte de Eliminaciones)
        empeno: this.empenos.whereVisible(actor, { incluirEliminados: true }),
        ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
      },
      include: {
        usuario: { select: { id: true, nombre: true } },
        empeno:  { select: { id: true, codigo: true, cliente: { select: { nombres: true, apellidos: true } } } },
      },
      orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
    });

    return movimientos.map((m: any) => ({
      id:      m.id,
      fecha:   m.fecha,
      tipo:    m.tipo,
      detalle: m.detalle,
      empeno:  { id: m.empeno.id, codigo: m.empeno.codigo },
      cliente: m.empeno.cliente,
      usuario: m.usuario,
    }));
  }
}
