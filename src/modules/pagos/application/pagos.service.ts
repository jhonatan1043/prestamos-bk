// src/modules/pagos/application/pagos.service.ts
import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import type { IPagoRepository } from '../domain/repositories/pago.repository';
import { Pago } from '../domain/entities/pago.entity';
import { CreatePagoDto } from './dto/create-pago.dto';
import { PrestamoMoraResumidoDto } from '../presentation/dto/prestamo-mora-resumido.dto';
import { PagoProyectadoDto } from '../presentation/dto/pago-proyectado.dto';
import { CreateClienteDto } from '../../clientes/presentation/dto/create-cliente.dto';
import { UpdatePagoDto } from './dto/update-pago.dto';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class PagosService {

  constructor(
    @Inject('IPagoRepository')
    private readonly pagoRepository: IPagoRepository,
    @Inject('IEstadoRepository')
    private readonly estadoRepository: any,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

    private calcularMontoCuota(monto: number, tasaAnual: number, cuotas: number, tipoPlazo: string): number {
    if (tipoPlazo === 'DIA') {
      const r = tasaAnual / 365 / 100;
      const n = cuotas;
      if (r > 0 && n > 0 && monto > 0) {
        return (monto * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      }
      return monto / cuotas;
    }
    if (tipoPlazo === 'SEMANA') {
      const r = tasaAnual / 52 / 100;
      const n = cuotas;
      if (r > 0 && n > 0 && monto > 0) {
        return (monto * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      }
      return monto / cuotas;
    }
    // MES y caso general
    const r = tasaAnual / 12 / 100;
    const n = cuotas;
    if (r > 0 && n > 0 && monto > 0) {
      return (monto * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }
    return monto / cuotas;
  }
  async pagosProyectados(prestamoId: number): Promise<PagoProyectadoDto[]> {
    const prestamo = await this.prisma.prestamo.findUnique({
      where: { id: prestamoId },
      include: { pagos: true },
    });
    if (!prestamo) throw new NotFoundException('Préstamo no encontrado');

  const numeroCuotas = this.calcularNumeroCuotas(prestamo.tipoPlazo, prestamo.plazoDias);
    const montoCuota = this.calcularMontoCuota(Number(prestamo.monto), prestamo.tasa ?? 24, numeroCuotas, prestamo.tipoPlazo);
    const fechaInicio = new Date(prestamo.fechaInicio);

    const proyectados: PagoProyectadoDto[] = [];
    for (let i = 1; i <= numeroCuotas; i++) {
      let fechaEstimada = new Date(fechaInicio);
      if (prestamo.tipoPlazo === 'DIA') {
        fechaEstimada.setDate(fechaInicio.getDate() + (i - 1));
      } else if (prestamo.tipoPlazo === 'SEMANA') {
        fechaEstimada.setDate(fechaInicio.getDate() + (i - 1) * 7);
      } else if (prestamo.tipoPlazo === 'MES') {
        fechaEstimada.setMonth(fechaInicio.getMonth() + (i - 1));
      }
      // Verificar si la cuota ya fue pagada
      const pagado = prestamo.pagos.some(p => {
        const pagoFecha = new Date(p.fecha);
        return Math.abs(pagoFecha.getTime() - fechaEstimada.getTime()) < 2 * 24 * 60 * 60 * 1000 && Number(p.monto) >= montoCuota * 0.9;
      });
      proyectados.push({
        prestamoId: prestamo.id,
        numeroCuota: i,
        fechaEstimada,
        montoEstimado: montoCuota,
        pagado,
      });
    }
    return proyectados;
  }

   private calcularNumeroCuotas(tipoPlazo: string, plazoDias: number): number {
  if (tipoPlazo === 'MES') return plazoDias;
  if (tipoPlazo === 'SEMANA') return plazoDias;
  if (tipoPlazo === 'DIA') return plazoDias;
  return 0;
 }


  private calcularFechaLimite(tipoPlazo: string, plazoDias: number, fechaInicio: Date): Date {
    const fechaLimite = new Date(fechaInicio);
    if (tipoPlazo === 'DIA') {
      fechaLimite.setDate(fechaLimite.getDate() + plazoDias);
    } else if (tipoPlazo === 'SEMANA') {
      fechaLimite.setDate(fechaLimite.getDate() + plazoDias * 7);
    } else if (tipoPlazo === 'MES') {
      fechaLimite.setMonth(fechaLimite.getMonth() + plazoDias);
    }
    return fechaLimite;
  }

  async actualizarEstado(id: number, estadoId: number) {
    // Validar que el pago exista
    const pago = await this.pagoRepository.findById(id);
    if (!pago) throw new NotFoundException('Pago no encontrado');
    // Validar que el estado exista
    const estado = await this.estadoRepository.findById(estadoId);
    if (!estado) throw new NotFoundException('Estado no encontrado');
    // Actualizar el estado del pago usando la relación Prisma
    return this.pagoRepository.update(id, { estadoId });
  }
  // ...existing code...

  /**
   * Registra un pago optimizado para el préstamo del cliente.
   * Si el monto es mayor a la cuota, abona primero pagos atrasados y luego futuros.
   */
  async create(dto: CreatePagoDto): Promise<Pago[]> {
    // Obtener el préstamo y sus pagos
    const prestamo = await this.prisma.prestamo.findUnique({
      where: { id: dto.prestamoId },
      include: { pagos: true, cliente: true },
    });
    if (!prestamo) throw new NotFoundException('Préstamo no encontrado');

    // Calcular cuota mensual (simplificado: monto / plazoDias)
    const cuota = Number(prestamo.monto) / prestamo.plazoDias;
    let montoRestante = Number(dto.monto);

    // Ordenar pagos por fecha
    const pagos = prestamo.pagos.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    // Buscar pagos atrasados (fecha < hoy y monto < cuota)
    const hoy = new Date();
    const pagosAtrasados = pagos.filter(p => new Date(p.fecha) < hoy && Number(p.monto) < cuota);
    const pagosFuturos = pagos.filter(p => new Date(p.fecha) >= hoy && Number(p.monto) < cuota);

    const pagosRegistrados: Pago[] = [];

    // Abonar primero pagos atrasados
    for (const pago of pagosAtrasados) {
      const pendiente = cuota - Number(pago.monto);
      if (montoRestante <= 0) break;
      const abono = Math.min(montoRestante, pendiente);
      await this.prisma.pago.update({
        where: { id: pago.id },
        data: { monto: Number(pago.monto) + abono },
      });
      montoRestante -= abono;
      const { Decimal } = await import('@prisma/client/runtime/library');
      pagosRegistrados.push({ ...pago, monto: new Decimal(Number(pago.monto) + abono), estadoId: pago.estadoId });
    }

    // Si queda saldo, abonar a pagos futuros
    for (const pago of pagosFuturos) {
      const pendiente = cuota - Number(pago.monto);
      if (montoRestante <= 0) break;
      const abono = Math.min(montoRestante, pendiente);
      await this.prisma.pago.update({
        where: { id: pago.id },
        data: { monto: Number(pago.monto) + abono },
      });
      montoRestante -= abono;
      const { Decimal } = await import('@prisma/client/runtime/library');
      pagosRegistrados.push({ ...pago, monto: new Decimal(Number(pago.monto) + abono), estadoId: pago.estadoId });
    }

    // Si aún queda saldo, registrar como nuevo pago extra
    if (montoRestante > 0) {
      // Convertir montoRestante a Decimal
      const { Decimal } = await import('@prisma/client/runtime/library');
      // Buscar el estado ACTIVO
      const estadoActivo = await this.estadoRepository.findAll();
      const estadoIdActivo = estadoActivo.find(e => e.nombre === 'ACTIVO')?.id;
      const nuevoPago = await this.pagoRepository.create({
        prestamoId: dto.prestamoId,
        fecha: dto.fecha,
        monto: new Decimal(montoRestante),
        estadoId: estadoIdActivo,
      });
      pagosRegistrados.push(nuevoPago);
      // Auditoría
      const auditLogService = this['auditLogService'];
      if (auditLogService) {
        await auditLogService.log(
          dto.usuarioId ?? 0,
          'CREATE_PAGO',
          'Pago',
          nuevoPago.id,
          `Pago creado por usuario ${dto.usuarioId ?? 0} para préstamo ${dto.prestamoId} por monto ${montoRestante}`
        );
      }
    }

    // Verificar si el préstamo está completamente pagado
    const prestamoActualizado = await this.prisma.prestamo.findUnique({
      where: { id: dto.prestamoId },
      include: { pagos: true },
    });
    if (prestamoActualizado) {
      const totalPagado = prestamoActualizado.pagos.reduce((sum, p) => sum + Number(p.monto), 0);
      if (totalPagado >= Number(prestamoActualizado.monto)) {
        // Buscar el estado FINALIZADO
        const estados = await this.estadoRepository.findAll();
        const estadoFinalizado = estados.find(e => e.nombre === 'FINALIZADO');
        if (estadoFinalizado) {
          await this.prisma.prestamo.update({
            where: { id: dto.prestamoId },
            data: { estadoId: estadoFinalizado.id },
          });
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
  // Si el pago no existe o el estado no es ACTIVO
  if (!pago) throw new NotFoundException('Pago no encontrado');
  // Si tienes la relación Estado cargada, puedes validar así:
  // const estado = await this.estadoRepository.findById(pago.estadoId);
  // if (!estado || estado.nombre !== 'ACTIVO') throw new NotFoundException('Pago no encontrado');
  return pago;
  }

  /**
   * Obtiene préstamos en mora según la fecha límite calculada por tipo de plazo (días, semanas, meses).
   * La fecha límite se calcula sumando:
   *   - Días: plazoDias
   *   - Semanas: plazoDias * 7
   *   - Meses: plazoDias meses reales (usando setMonth)
   * Retorna préstamos activos con saldo pendiente y vencidos por plazo.
   */
  async prestamosEnMora(): Promise<PrestamoMoraResumidoDto[]> {
    const prestamos = await this.prisma.prestamo.findMany({
      where: { estado: { nombre: 'ACTIVO' } },
      include: { pagos: true, cliente: true },
    });

    const hoy = new Date();
    return prestamos
      .map(prestamo => {
        const montoPrestamo = Number(prestamo.monto);
        const totalPagado = prestamo.pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);
        const saldoPendiente = montoPrestamo - totalPagado;
        const fechaLimite = this.calcularFechaLimite(prestamo.tipoPlazo, prestamo.plazoDias, prestamo.fechaInicio);
        const vencidoPorPlazo = hoy > fechaLimite;
        if (saldoPendiente > 0 && vencidoPorPlazo) {
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
      .filter(item => item !== null);
  }

  /**
   * Historial de pagos cancelados
   */
  async historialPagosCancelados(): Promise<Pago[]> {
    // Buscar pagos de préstamos cancelados
    const prestamosCancelados = await this.prisma.prestamo.findMany({
      where: { estado: { nombre: 'CANCELADO' } },
      include: { pagos: true },
    });
    // Retornar los pagos tal cual, ya que ahora tienen estadoId
    return prestamosCancelados.flatMap(p => p.pagos);
  }

  /**
   * Calcula el saldo pendiente de un préstamo
   */
  async saldoPendientePrestamo(prestamoId: number): Promise<number> {
    const prestamo = await this.prisma.prestamo.findUnique({
      where: { id: prestamoId },
      include: { pagos: true },
    });
    if (!prestamo) throw new NotFoundException('Préstamo no encontrado');
    const totalPagado = prestamo.pagos.reduce((sum, p) => sum + Number(p.monto), 0);
    return Number(prestamo.monto) - totalPagado;
  }

  async update(id: number, dto: UpdatePagoDto): Promise<Pago> {
    return this.pagoRepository.update(id, dto);
  }

  async delete(id: number): Promise<void> {
    return this.pagoRepository.delete(id);
  }
}
