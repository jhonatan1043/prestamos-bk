import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantPrismaService } from '../../../common/tenant/tenant-prisma.service';
import { AuditAction, AuditLogService } from '../../../common/audit/audit-log.service';
import { esAdmin } from '../../../common/auth/roles';
import { sumarPeriodos } from '../domain/periodos';
import { esFinal } from '../domain/estado';
import { generarCodigoConsulta, siguienteCodigo } from '../domain/codigos';
import { aDetalle, aResumen, estadoActual } from './empeno-calculo';
import { CreateEmpenoDto } from './dto/create-empeno.dto';
import { UpdateEmpenoDto } from './dto/update-empeno.dto';
import { FiltrosEmpenoDto } from './dto/filtros-empeno.dto';

export type Actor = { id: number; role?: string; roles?: any; schemaName?: string };
export type TipoMovimiento = 'ENTRADA' | 'REFRENDO' | 'ABONO' | 'SALIDA' | 'CAMBIO_ESTADO' | 'EDICION' | 'ELIMINACION';

const CAMPOS_FINANCIEROS = ['montoPrestado', 'tasa', 'tipoPlazo', 'periodosMinimos', 'periodosMaximos', 'fechaIngreso'] as const;

export const INCLUDE_LISTA = {
  articulo: true,
  cliente:  { select: { id: true, nombres: true, apellidos: true, identificacion: true } },
} satisfies Prisma.EmpenoInclude;

export const INCLUDE_DETALLE = {
  ...INCLUDE_LISTA,
  usuario:     { select: { id: true, nombre: true } },
  pagos:       { where: { deletedAt: null }, orderBy: [{ fecha: 'asc' }, { id: 'asc' }] },
  movimientos: { orderBy: [{ fecha: 'asc' }, { id: 'asc' }], include: { usuario: { select: { id: true, nombre: true } } } },
} satisfies Prisma.EmpenoInclude;

@Injectable()
export class EmpenosService {
  constructor(
    private readonly prisma: TenantPrismaService,
    private readonly audit:  AuditLogService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  /** Filtro base: no eliminados y, si no es admin, solo los que registró el actor. */
  whereVisible(actor: Actor, opts: { incluirEliminados?: boolean } = {}): Prisma.EmpenoWhereInput {
    const where: Prisma.EmpenoWhereInput = {};
    if (!(opts.incluirEliminados && esAdmin(actor))) where.deletedAt = null;
    if (!esAdmin(actor)) where.usuarioId = actor.id;
    return where;
  }

  async listar(filtros: FiltrosEmpenoDto, actor: Actor) {
    const ahora = new Date();
    const where: Prisma.EmpenoWhereInput = this.whereVisible(actor, { incluirEliminados: filtros.incluirEliminados === 'true' });

    if (filtros.clienteId) where.clienteId = filtros.clienteId;
    if (filtros.estado === 'VENCIDO') {
      where.estado = { in: ['ACTIVO', 'VENCIDO'] };
      where.fechaMaxima = { lt: ahora };
    } else if (filtros.estado === 'ACTIVO') {
      where.estado = { in: ['ACTIVO', 'VENCIDO'] };
      where.fechaMaxima = { gte: ahora };
    } else if (filtros.estado) {
      where.estado = filtros.estado;
    }
    if (filtros.vencenEnDias) {
      where.estado = { in: ['ACTIVO', 'VENCIDO'] };
      where.fechaMaxima = { gte: ahora, lte: new Date(ahora.getTime() + filtros.vencenEnDias * 86_400_000) };
    }
    if (filtros.q?.trim()) {
      const q = filtros.q.trim();
      where.OR = [
        { codigo:   { contains: q, mode: 'insensitive' } },
        { articulo: { placa:       { contains: q, mode: 'insensitive' } } },
        { articulo: { descripcion: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const empenos = await this.db.empeno.findMany({ where, include: INCLUDE_LISTA, orderBy: { fechaIngreso: 'desc' } });
    return empenos.map(aResumen);
  }

  async obtener(id: number, actor: Actor, opts: { incluirEliminados?: boolean } = {}) {
    const e = await this.db.empeno.findFirst({
      where:   { id, ...this.whereVisible(actor, opts) },
      include: INCLUDE_DETALLE,
    });
    if (!e) throw new NotFoundException(`Empeño #${id} no encontrado`);
    return aDetalle(e.deletedAt ? e : await this.sincronizarEstado(e, actor));
  }

  /** Empeño visible, no eliminado y con sus pagos, para operar sobre él. */
  async cargarParaOperar(id: number, actor: Actor, tx: any = this.db) {
    const e = await tx.empeno.findFirst({
      where:   { id, ...this.whereVisible(actor) },
      include: INCLUDE_DETALLE,
    });
    if (!e) throw new NotFoundException(`Empeño #${id} no encontrado`);
    return e;
  }

  async crear(dto: CreateEmpenoDto, actor: Actor) {
    this.validarCondiciones(dto.periodosMinimos, dto.periodosMaximos);
    this.validarArticulo(dto.tipoArticulo, dto.articulo);

    const fechaIngreso = dto.fechaIngreso ? new Date(dto.fechaIngreso) : new Date();
    if (fechaIngreso.getTime() > Date.now() + 60_000) {
      throw new BadRequestException('La fecha de ingreso no puede ser futura');
    }

    const cliente = await this.db.cliente.findFirst({ where: { id: dto.clienteId, active: true }, select: { id: true } });
    if (!cliente) throw new NotFoundException(`Cliente #${dto.clienteId} no encontrado`);

    const tipoPlazo = dto.tipoPlazo ?? 'MES';
    const { articulo, ...resto } = dto;

    const creado = await this.db.$transaction(async (tx: any) => {
      const ultimo = await tx.empeno.findFirst({ orderBy: { id: 'desc' }, select: { codigo: true } });
      const empeno = await tx.empeno.create({
        data: {
          ...resto,
          tipoPlazo,
          fechaIngreso,
          codigo:         siguienteCodigo(ultimo?.codigo ?? null),
          usuarioId:      actor.id,
          fechaMinima:    sumarPeriodos(fechaIngreso, dto.periodosMinimos, tipoPlazo),
          fechaMaxima:    sumarPeriodos(fechaIngreso, dto.periodosMaximos, tipoPlazo),
          saldoCapital:   dto.montoPrestado,
          codigoConsulta: generarCodigoConsulta(),
          articulo:       { create: this.datosArticulo(dto.tipoArticulo, articulo) },
        },
      });
      await this.registrarMovimiento(tx, empeno.id, 'ENTRADA', actor.id,
        `Ingreso de ${articulo.descripcion} por ${dto.montoPrestado}`);
      return empeno;
    });

    await this.audit.log(actor.id, AuditAction.EMPENO_CREAR, 'Empeno', creado.id,
      `Empeño ${creado.codigo} — cliente #${dto.clienteId} — monto ${dto.montoPrestado}`);
    return this.obtener(creado.id, actor);
  }

  async actualizar(id: number, dto: UpdateEmpenoDto, actor: Actor) {
    const e = await this.cargarParaOperar(id, actor);
    if (esFinal(e.estado)) throw new ConflictException('No se puede editar un empeño cuyo artículo ya salió');

    const cambiaCondiciones = CAMPOS_FINANCIEROS.some(c => dto[c] !== undefined);
    if (cambiaCondiciones && e.pagos.length > 0) {
      throw new ConflictException('No se pueden cambiar las condiciones de un empeño con pagos registrados');
    }

    const { articulo, ...campos } = dto;
    const data: any = { ...campos };
    if (cambiaCondiciones) {
      const min  = dto.periodosMinimos ?? e.periodosMinimos;
      const max  = dto.periodosMaximos ?? e.periodosMaximos;
      const plazo = dto.tipoPlazo ?? e.tipoPlazo;
      const ingreso = dto.fechaIngreso ? new Date(dto.fechaIngreso) : e.fechaIngreso;
      if (ingreso.getTime() > Date.now() + 60_000) throw new BadRequestException('La fecha de ingreso no puede ser futura');
      this.validarCondiciones(min, max);
      Object.assign(data, {
        fechaIngreso: ingreso,
        fechaMinima:  sumarPeriodos(ingreso, min, plazo),
        fechaMaxima:  sumarPeriodos(ingreso, max, plazo),
        saldoCapital: dto.montoPrestado ?? e.montoPrestado,
      });
    }
    if (articulo) {
      const combinado = { ...e.articulo, ...articulo };
      this.validarArticulo(e.tipoArticulo, combinado);
      data.articulo = { update: this.datosArticulo(e.tipoArticulo, articulo) };
    }

    const cambios = Object.keys({ ...campos, ...(articulo ? { articulo } : {}) }).join(', ') || 'sin cambios';
    await this.db.$transaction(async (tx: any) => {
      await tx.empeno.update({ where: { id }, data });
      await this.registrarMovimiento(tx, id, 'EDICION', actor.id, `Campos editados: ${cambios}`);
    });
    await this.audit.log(actor.id, AuditAction.EMPENO_ACTUALIZAR, 'Empeno', id, `Empeño ${e.codigo} — ${cambios}`);
    return this.obtener(id, actor);
  }

  async eliminar(id: number, actor: Actor) {
    const e = await this.cargarParaOperar(id, actor);
    await this.db.$transaction(async (tx: any) => {
      await tx.empeno.update({ where: { id }, data: { deletedAt: new Date(), deletedById: actor.id } });
      await this.registrarMovimiento(tx, id, 'ELIMINACION', actor.id, `Empeño ${e.codigo} eliminado`);
    });
    await this.audit.log(actor.id, AuditAction.EMPENO_ELIMINAR, 'Empeno', id, `Empeño ${e.codigo} eliminado (soft delete)`);
  }

  async registrarMovimiento(tx: any, empenoId: number, tipo: TipoMovimiento, usuarioId: number, detalle: string) {
    await tx.movimientoEmpeno.create({ data: { empenoId, tipo, usuarioId, detalle } });
  }

  /** Persiste VENCIDO/ACTIVO cuando la fecha máxima lo cambió. */
  private async sincronizarEstado(e: any, actor: Actor) {
    const actual = estadoActual(e);
    if (actual === e.estado || esFinal(e.estado)) return e;
    await this.db.$transaction(async (tx: any) => {
      await tx.empeno.update({ where: { id: e.id }, data: { estado: actual } });
      await this.registrarMovimiento(tx, e.id, 'CAMBIO_ESTADO', actor.id, `${e.estado} → ${actual}`);
    });
    return { ...e, estado: actual };
  }

  private validarCondiciones(min: number, max: number) {
    if (max < min) throw new BadRequestException('periodosMaximos no puede ser menor que periodosMinimos');
  }

  private validarArticulo(tipo: string, articulo: any) {
    if (tipo !== 'VEHICULO') return;
    const faltan = ['placa', 'marca', 'modelo', 'anio'].filter(c => !articulo?.[c]);
    if (faltan.length) throw new BadRequestException(`Para un vehículo son obligatorios: ${faltan.join(', ')}`);
  }

  /** Datos del artículo; en artículos generales se descartan los campos de vehículo. */
  private datosArticulo(tipo: string, articulo: any) {
    if (tipo === 'VEHICULO') return { ...articulo };
    const { placa, marca, modelo, anio, color, numeroChasis, numeroMotor, kilometraje, ...general } = articulo;
    return general;
  }
}
