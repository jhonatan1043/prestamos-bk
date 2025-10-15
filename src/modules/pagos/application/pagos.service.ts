// src/modules/pagos/application/pagos.service.ts
import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import type { IPagoRepository } from '../domain/repositories/pago.repository';
import { Pago } from '../domain/entities/pago.entity';
import { CreatePagoDto } from './dto/create-pago.dto';
import { PrestamoEnMoraDto } from '../presentation/dto/prestamo-en-mora.dto';
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

  private calcularCuotasMes(tipoPlazo: string, plazoDias: number): number {
    if (tipoPlazo === 'MES') return plazoDias;
    if (tipoPlazo === 'SEMANA') return plazoDias * 4;
    return Math.ceil(plazoDias / 30);
  }

  private calcularCuotaMensual(monto: number, tasaAnual: number, cuotas: number): number {
    const r = tasaAnual / 12 / 100;
    const n = cuotas;
    if (r > 0 && n > 0 && monto > 0) {
      return (monto * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }
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
  async prestamosEnMora(): Promise<any[]> {
    // Buscar todos los préstamos con sus pagos y cliente
    const prestamos = await this.prisma.prestamo.findMany({
      where: { estado: { nombre: 'ACTIVO' } },
      include: { pagos: true, cliente: true },
    });

    const result: PrestamoEnMoraDto[] = [];
    const hoy = new Date();
    for (const prestamo of prestamos) {
      const montoPrestamo = Number(prestamo.monto);
      const pagos = prestamo.pagos.filter(pago => pago.prestamoId === prestamo.id);
      const totalPagado = pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);
      const saldoPendiente = montoPrestamo - totalPagado;
      const clienteDto = prestamo.cliente as CreateClienteDto;
      const pagosDto = pagos.map(p => ({
        prestamoId: p.prestamoId,
        fecha: p.fecha,
        monto: p.monto
      })) as CreatePagoDto[];
      const fechaLimite = this.calcularFechaLimite(prestamo.tipoPlazo, prestamo.plazoDias, prestamo.fechaInicio);
      const vencidoPorPlazo = hoy > fechaLimite;
      const cuotas = this.calcularCuotasMes(prestamo.tipoPlazo, prestamo.plazoDias);
      const tasaAnual = prestamo.tasa ?? 24;
      const cuotaMensualEstimada = this.calcularCuotaMensual(montoPrestamo, tasaAnual, cuotas);
      if (saldoPendiente > 0 && vencidoPorPlazo) {
        result.push({
          id: prestamo.id,
          cliente: clienteDto,
          pagos: pagosDto,
          montoPrestamo,
          totalPagado,
          saldoPendiente,
          fechaLimite,
          cuotas,
          tasaAnual,
          cuotaMensualEstimada
        });
      }
    }
    return result;
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
