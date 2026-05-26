import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import type { IPagoRepository } from '../domain/repositories/pago.repository';
import { Pago } from '../domain/entities/pago.entity';
import { CreatePagoDto } from './dto/create-pago.dto';
import { UpdatePagoDto } from './dto/update-pago.dto';
import { TenantPrismaService } from '../../../common/tenant/tenant-prisma.service';
import { PrestamoMoraResumidoDto } from '../presentation/dto/prestamo-mora-resumido.dto';
import { PagoProyectadoDto } from '../presentation/dto/pago-proyectado.dto';
import { AuditLogService, AuditAction } from '../../../common/audit/audit-log.service';

@Injectable()
export class PagosService {
  constructor(
    @Inject('IPagoRepository')
    private readonly pagoRepository: IPagoRepository,
    @Inject('IEstadoRepository')
    private readonly estadoRepository: any,
    private readonly prisma: TenantPrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ─── Helpers privados ─────────────────────────────────────────────────────

  private calcularNumeroCuotas(tipoPlazo: string, plazoDias: number): number {
    return plazoDias; // DIA | SEMANA | MES — el número de cuotas es siempre plazoDias
  }

  private calcularMontoCuota(monto: number, tasaAnual: number, cuotas: number, tipoPlazo: string): number {
    let r: number;
    if (tipoPlazo === 'DIA')    r = tasaAnual / 365 / 100;
    else if (tipoPlazo === 'SEMANA') r = tasaAnual / 52  / 100;
    else                        r = tasaAnual / 12  / 100;

    if (r > 0 && cuotas > 0 && monto > 0) {
      return (monto * r * Math.pow(1 + r, cuotas)) / (Math.pow(1 + r, cuotas) - 1);
    }
    return monto / cuotas;
  }

  private calcularFechaLimite(tipoPlazo: string, plazoDias: number, fechaInicio: Date): Date {
    const fecha = new Date(fechaInicio);
    if      (tipoPlazo === 'DIA')    fecha.setDate(fecha.getDate() + plazoDias);
    else if (tipoPlazo === 'SEMANA') fecha.setDate(fecha.getDate() + plazoDias * 7);
    else if (tipoPlazo === 'MES')    fecha.setMonth(fecha.getMonth() + plazoDias);
    return fecha;
  }

  // ─── CRUD principal ────────────────────────────────────────────────────────

  async create(dto: CreatePagoDto, userId: number): Promise<Pago[]> {
    const prestamo = await this.prisma.prestamo.findUnique({
      where: { id: dto.prestamoId },
      include: { pagos: true, cliente: true },
    });
    if (!prestamo) throw new NotFoundException('Préstamo no encontrado');

    const cuota = Number(prestamo.monto) / prestamo.plazoDias;
    let montoRestante = Number(dto.monto);

    const pagos = prestamo.pagos.sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
    );

    const hoy = new Date();
    const pagosAtrasados = pagos.filter(p => new Date(p.fecha) < hoy && Number(p.monto) < cuota);
    const pagosFuturos   = pagos.filter(p => new Date(p.fecha) >= hoy && Number(p.monto) < cuota);

    const pagosRegistrados: Pago[] = [];

    // Abonar primero pagos atrasados
    for (const pago of pagosAtrasados) {
      if (montoRestante <= 0) break;
      const abono = Math.min(montoRestante, cuota - Number(pago.monto));
      await this.prisma.pago.update({
        where: { id: pago.id },
        data: { monto: Number(pago.monto) + abono },
      });
      montoRestante -= abono;
      const { Decimal } = await import('@prisma/client/runtime/library');
      pagosRegistrados.push({ ...pago, monto: new Decimal(Number(pago.monto) + abono), estadoId: pago.estadoId });
    }

    // Luego pagos futuros
    for (const pago of pagosFuturos) {
      if (montoRestante <= 0) break;
      const abono = Math.min(montoRestante, cuota - Number(pago.monto));
      await this.prisma.pago.update({
        where: { id: pago.id },
        data: { monto: Number(pago.monto) + abono },
      });
      montoRestante -= abono;
      const { Decimal } = await import('@prisma/client/runtime/library');
      pagosRegistrados.push({ ...pago, monto: new Decimal(Number(pago.monto) + abono), estadoId: pago.estadoId });
    }

    // Si queda saldo, crear nuevo pago
    if (montoRestante > 0) {
      const { Decimal } = await import('@prisma/client/runtime/library');
      const estados = await this.estadoRepository.findAll();
      const estadoIdActivo = estados.find((e: any) => e.nombre === 'ACTIVO')?.id;
      const nuevoPago = await this.pagoRepository.create({
        prestamoId: dto.prestamoId,
        fecha: dto.fecha,
        monto: new Decimal(montoRestante),
        estadoId: estadoIdActivo,
      });
      pagosRegistrados.push(nuevoPago);

      await this.auditLogService.log(
        userId,
        AuditAction.PAGO_CREAR,
        'Pago',
        nuevoPago.id,
        `Pago creado para préstamo #${dto.prestamoId} — monto $${montoRestante}`,
      );
    }

    // Verificar si el préstamo quedó saldado
    const prestamoActualizado = await this.prisma.prestamo.findUnique({
      where: { id: dto.prestamoId },
      include: { pagos: true },
    });
    if (prestamoActualizado) {
      const totalPagado = prestamoActualizado.pagos.reduce((sum, p) => sum + Number(p.monto), 0);
      if (totalPagado >= Number(prestamoActualizado.monto)) {
        const estados = await this.estadoRepository.findAll();
        const estadoFinalizado = estados.find((e: any) => e.nombre === 'FINALIZADO');
        if (estadoFinalizado) {
          await this.prisma.prestamo.update({
            where: { id: dto.prestamoId },
            data: { estadoId: estadoFinalizado.id },
          });
          await this.auditLogService.log(
            userId,
            AuditAction.PRESTAMO_ESTADO,
            'Prestamo',
            dto.prestamoId,
            `Préstamo #${dto.prestamoId} marcado como FINALIZADO — saldo saldado`,
          );
        }
      }
    }

    return pagosRegistrados;
  }

  async findAll(): Promise<Pago[]> {
    return this.pagoRepository.findAll();
  }

  async findById(id: number): Promise<Pago> {
    const pago = await this.pagoRepository.findById(id);
    if (!pago) throw new NotFoundException('Pago no encontrado');
    return pago;
  }

  async update(id: number, dto: UpdatePagoDto, userId: number): Promise<Pago> {
    const pago = await this.pagoRepository.findById(id);
    if (!pago) throw new NotFoundException('Pago no encontrado');

    const updated = await this.pagoRepository.update(id, dto);

    await this.auditLogService.log(
      userId,
      AuditAction.PAGO_ACTUALIZAR,
      'Pago',
      id,
      `Pago #${id} actualizado — campos: ${Object.keys(dto).join(', ')}`,
    );

    return updated;
  }

  async delete(id: number, userId: number): Promise<void> {
    const pago = await this.pagoRepository.findById(id);
    if (!pago) throw new NotFoundException('Pago no encontrado');

    await this.pagoRepository.delete(id);

    await this.auditLogService.log(
      userId,
      AuditAction.PAGO_ELIMINAR,
      'Pago',
      id,
      `Pago #${id} eliminado`,
    );
  }

  async actualizarEstado(id: number, estadoId: number, userId: number): Promise<Pago> {
    const pago = await this.pagoRepository.findById(id);
    if (!pago) throw new NotFoundException('Pago no encontrado');

    const estado = await this.estadoRepository.findById(estadoId);
    if (!estado) throw new NotFoundException('Estado no encontrado');

    const updated = await this.pagoRepository.update(id, { estadoId });

    await this.auditLogService.log(
      userId,
      AuditAction.PAGO_ESTADO,
      'Pago',
      id,
      `Pago #${id} estado cambiado a "${estado.nombre}"`,
    );

    return updated;
  }

  // ─── Reportes ─────────────────────────────────────────────────────────────

  async pagosProyectados(prestamoId: number): Promise<PagoProyectadoDto[]> {
    const prestamo = await this.prisma.prestamo.findUnique({
      where: { id: prestamoId },
      include: { pagos: true },
    });
    if (!prestamo) throw new NotFoundException('Préstamo no encontrado');

    const numeroCuotas = this.calcularNumeroCuotas(prestamo.tipoPlazo, prestamo.plazoDias);
    const montoCuota   = this.calcularMontoCuota(Number(prestamo.monto), prestamo.tasa ?? 24, numeroCuotas, prestamo.tipoPlazo);
    const fechaInicio  = new Date(prestamo.fechaInicio);

    return Array.from({ length: numeroCuotas }, (_, i) => {
      const fechaEstimada = new Date(fechaInicio);
      if      (prestamo.tipoPlazo === 'DIA')    fechaEstimada.setDate(fechaInicio.getDate() + i);
      else if (prestamo.tipoPlazo === 'SEMANA') fechaEstimada.setDate(fechaInicio.getDate() + i * 7);
      else if (prestamo.tipoPlazo === 'MES')    fechaEstimada.setMonth(fechaInicio.getMonth() + i);

      const pagado = prestamo.pagos.some(p => {
        const diff = Math.abs(new Date(p.fecha).getTime() - fechaEstimada.getTime());
        return diff < 2 * 24 * 60 * 60 * 1000 && Number(p.monto) >= montoCuota * 0.9;
      });

      return { prestamoId: prestamo.id, numeroCuota: i + 1, fechaEstimada, montoEstimado: montoCuota, pagado };
    });
  }

  async prestamosEnMora(): Promise<PrestamoMoraResumidoDto[]> {
    const prestamos = await this.prisma.prestamo.findMany({
      where: { estado: { nombre: 'ACTIVO' } },
      include: { pagos: true, cliente: true },
    });

    const hoy = new Date();
    return prestamos
      .map(prestamo => {
        const montoPrestamo  = Number(prestamo.monto);
        const totalPagado    = prestamo.pagos.reduce((sum, p) => sum + Number(p.monto), 0);
        const saldoPendiente = montoPrestamo - totalPagado;
        const fechaLimite    = this.calcularFechaLimite(prestamo.tipoPlazo, prestamo.plazoDias, prestamo.fechaInicio);

        if (saldoPendiente > 0 && hoy > fechaLimite) {
          return {
            id: prestamo.id,
            nombreCliente: `${prestamo.cliente.nombres} ${prestamo.cliente.apellidos}`,
            montoPrestamo,
            totalPagado,
            saldoPendiente,
            fechaLimite,
          };
        }
        return null;
      })
      .filter((item): item is PrestamoMoraResumidoDto => item !== null);
  }

  async historialPagosCancelados(): Promise<Pago[]> {
    const prestamosCancelados = await this.prisma.prestamo.findMany({
      where: { estado: { nombre: 'CANCELADO' } },
      include: { pagos: true },
    });
    return prestamosCancelados.flatMap(p => p.pagos as unknown as Pago[]);
  }

  async saldoPendientePrestamo(prestamoId: number): Promise<number> {
    const prestamo = await this.prisma.prestamo.findUnique({
      where: { id: prestamoId },
      include: { pagos: true },
    });
    if (!prestamo) throw new NotFoundException('Préstamo no encontrado');
    const totalPagado = prestamo.pagos.reduce((sum, p) => sum + Number(p.monto), 0);
    return Number(prestamo.monto) - totalPagado;
  }
}
