import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/tenant/tenant-prisma.service';
import { AuditAction, AuditLogService } from '../../../common/audit/audit-log.service';
import { ErrorLiquidacion, Liquidacion, PagoParaReplay, liquidar, reconstruirEstado } from '../domain/liquidacion';
import { esFinal, estadoEfectivo, puedeRegistrarSalida } from '../domain/estado';
import { datosDe, estadoActual, estadoDe, pagosDe } from './empeno-calculo';
import { Actor, EmpenosService, TipoMovimiento } from './empenos.service';
import { CreatePagoEmpenoDto } from './dto/create-pago-empeno.dto';
import { UpdatePagoEmpenoDto } from './dto/update-pago-empeno.dto';
import { SalidaEmpenoDto } from './dto/salida-empeno.dto';

/** Id provisional para ordenar un pago nuevo después de los existentes del mismo día. */
const ID_NUEVO = Number.MAX_SAFE_INTEGER;

const MOVIMIENTO_POR_TIPO: Record<PagoParaReplay['tipo'], TipoMovimiento> = {
  INTERES:       'REFRENDO',
  ABONO_CAPITAL: 'ABONO',
  CANCELACION:   'SALIDA',
};

@Injectable()
export class EmpenoPagosService {
  constructor(
    private readonly prisma:  TenantPrismaService,
    private readonly empenos: EmpenosService,
    private readonly audit:   AuditLogService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  async liquidacion(id: number, actor: Actor, fecha?: Date): Promise<Liquidacion> {
    const e = await this.empenos.cargarParaOperar(id, actor);
    return liquidar(datosDe(e), estadoDe(e), fecha ?? new Date());
  }

  async registrarPago(id: number, dto: CreatePagoEmpenoDto, actor: Actor) {
    const e = await this.empenos.cargarParaOperar(id, actor);
    if (esFinal(e.estado)) throw new ConflictException('El artículo ya salió: no admite más pagos');
    if (dto.tipo === 'INTERES' && !dto.periodosCubiertos) {
      throw new BadRequestException('El refrendo requiere periodosCubiertos');
    }
    const fecha = this.fechaPago(dto.fecha);
    const nuevo: PagoParaReplay = {
      id: ID_NUEVO, tipo: dto.tipo, monto: dto.monto, fecha, periodosCubiertos: dto.periodosCubiertos ?? 0,
    };
    const existentes = pagosDe(e);
    this.validar(e, [...existentes, nuevo]); // antes de escribir nada

    await this.db.$transaction(async (tx: any) => {
      const pago = await tx.pagoEmpeno.create({
        data: {
          empenoId: id, usuarioId: actor.id, fecha, tipo: dto.tipo,
          monto: dto.monto, periodosCubiertos: nuevo.periodosCubiertos,
        },
      });
      await this.aplicar(tx, e, [...existentes, { ...nuevo, id: pago.id }]);
      await this.empenos.registrarMovimiento(tx, id, MOVIMIENTO_POR_TIPO[dto.tipo], actor.id,
        `${this.nombrePago(dto.tipo)} por ${dto.monto}`);
    });

    await this.audit.log(actor.id, AuditAction.PAGO_EMPENO_CREAR, 'Empeno', id, `${this.nombrePago(dto.tipo)} de ${dto.monto} en ${e.codigo}`);
    if (dto.tipo === 'INTERES') {
      await this.audit.log(actor.id, AuditAction.EMPENO_REFRENDO, 'Empeno', id, `Refrendo de ${dto.periodosCubiertos} periodo(s) en ${e.codigo}`);
    }
    if (dto.tipo === 'CANCELACION') {
      await this.audit.log(actor.id, AuditAction.EMPENO_SALIDA, 'Empeno', id, `Rescate de ${e.codigo} por ${dto.monto}`);
    }
    return this.empenos.obtener(id, actor);
  }

  async editarPago(id: number, pagoId: number, dto: UpdatePagoEmpenoDto, actor: Actor) {
    const e = await this.cargarEditable(id, actor);
    const pagos = pagosDe(e);
    const actual = pagos.find(p => p.id === pagoId);
    if (!actual) throw new NotFoundException(`Pago #${pagoId} no encontrado`);

    const editado: PagoParaReplay = {
      ...actual,
      monto:             dto.monto ?? actual.monto,
      periodosCubiertos: dto.periodosCubiertos ?? actual.periodosCubiertos,
      fecha:             dto.fecha ? this.fechaPago(dto.fecha) : actual.fecha,
    };
    const nuevos = pagos.map(p => (p.id === pagoId ? editado : p));
    this.validar(e, nuevos);

    await this.db.$transaction(async (tx: any) => {
      await tx.pagoEmpeno.update({
        where: { id: pagoId },
        data:  { monto: editado.monto, periodosCubiertos: editado.periodosCubiertos, fecha: editado.fecha },
      });
      await this.aplicar(tx, e, nuevos);
      await this.empenos.registrarMovimiento(tx, id, 'EDICION', actor.id,
        `Pago #${pagoId} editado: ${actual.monto} → ${editado.monto}`);
    });
    await this.audit.log(actor.id, AuditAction.PAGO_EMPENO_ACTUALIZAR, 'Empeno', id, `Pago #${pagoId} de ${e.codigo} editado`);
    return this.empenos.obtener(id, actor);
  }

  async eliminarPago(id: number, pagoId: number, actor: Actor) {
    const e = await this.cargarEditable(id, actor);
    const pagos = pagosDe(e);
    const pago = pagos.find(p => p.id === pagoId);
    if (!pago) throw new NotFoundException(`Pago #${pagoId} no encontrado`);

    const restantes = pagos.filter(p => p.id !== pagoId);
    this.validar(e, restantes);

    await this.db.$transaction(async (tx: any) => {
      await tx.pagoEmpeno.update({ where: { id: pagoId }, data: { deletedAt: new Date(), deletedById: actor.id } });
      await this.aplicar(tx, e, restantes);
      await this.empenos.registrarMovimiento(tx, id, 'EDICION', actor.id,
        `Pago #${pagoId} (${this.nombrePago(pago.tipo)} por ${pago.monto}) eliminado`);
    });
    await this.audit.log(actor.id, AuditAction.PAGO_EMPENO_ELIMINAR, 'Empeno', id, `Pago #${pagoId} de ${e.codigo} eliminado (soft delete)`);
    return this.empenos.obtener(id, actor);
  }

  async registrarSalida(id: number, dto: SalidaEmpenoDto, actor: Actor) {
    const e = await this.empenos.cargarParaOperar(id, actor);
    if (!puedeRegistrarSalida(estadoActual(e))) {
      throw new ConflictException('Solo se puede registrar la salida de un empeño vencido');
    }
    await this.db.$transaction(async (tx: any) => {
      await tx.empeno.update({
        where: { id },
        data: {
          estado:       dto.tipo,
          fechaSalida:  new Date(),
          motivoSalida: dto.motivo,
          montoSalida:  dto.montoSalida ?? null,
        },
      });
      await this.empenos.registrarMovimiento(tx, id, 'SALIDA', actor.id,
        `${dto.tipo === 'VENDIDO' ? 'Vendido' : 'Adjudicado'}: ${dto.motivo}${dto.montoSalida !== undefined ? ` (${dto.montoSalida})` : ''}`);
    });
    await this.audit.log(actor.id, AuditAction.EMPENO_SALIDA, 'Empeno', id, `Salida ${dto.tipo} de ${e.codigo}`);
    return this.empenos.obtener(id, actor);
  }

  // ─── Internos ──────────────────────────────────────────────────────────────

  /** Pagos de un empeño vendido o adjudicado ya no se tocan. */
  private async cargarEditable(id: number, actor: Actor) {
    const e = await this.empenos.cargarParaOperar(id, actor);
    if (e.estado === 'VENDIDO' || e.estado === 'ADJUDICADO') {
      throw new ConflictException('No se pueden modificar pagos de un empeño vendido o adjudicado');
    }
    return e;
  }

  private validar(e: any, pagos: PagoParaReplay[]) {
    try {
      return reconstruirEstado(datosDe(e), pagos);
    } catch (err) {
      if (err instanceof ErrorLiquidacion) throw new BadRequestException(err.message);
      throw err;
    }
  }

  /** Guarda el desglose de cada pago y el estado resultante del empeño. */
  private async aplicar(tx: any, e: any, pagos: PagoParaReplay[]) {
    const estado = this.validar(e, pagos);

    for (const d of estado.desglose) {
      await tx.pagoEmpeno.update({
        where: { id: d.id },
        data:  { interesAbonado: d.interesAbonado, capitalAbonado: d.capitalAbonado, saldoCapitalDespues: d.saldoCapitalDespues },
      });
    }

    const cancelacion = pagos.find(p => p.tipo === 'CANCELACION');
    await tx.empeno.update({
      where: { id: e.id },
      data: {
        saldoCapital:    estado.saldoCapital,
        periodosPagados: estado.periodosPagados,
        fechaMaxima:     estado.fechaMaxima,
        ...(estado.cancelado
          ? { estado: 'RECUPERADO', fechaSalida: estado.fechaCancelacion, motivoSalida: 'Rescate por el cliente', montoSalida: cancelacion!.monto }
          : { estado: estadoEfectivo('ACTIVO', estado.fechaMaxima, new Date()), fechaSalida: null, motivoSalida: null, montoSalida: null }),
      },
    });
  }

  private fechaPago(fecha?: string): Date {
    const f = fecha ? new Date(fecha) : new Date();
    if (f.getTime() > Date.now() + 60_000) throw new BadRequestException('La fecha del pago no puede ser futura');
    return f;
  }

  private nombrePago(tipo: PagoParaReplay['tipo']): string {
    return tipo === 'INTERES' ? 'Pago de intereses' : tipo === 'ABONO_CAPITAL' ? 'Abono a capital' : 'Rescate';
  }
}
