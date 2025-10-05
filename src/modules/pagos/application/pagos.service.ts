// src/modules/pagos/application/pagos.service.ts
import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import type { IPagoRepository } from '../domain/repositories/pago.repository';
import { Pago } from '../domain/entities/pago.entity';
import { CreatePagoDto } from './dto/create-pago.dto';
import { UpdatePagoDto } from './dto/update-pago.dto';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class PagosService {
  constructor(
    @Inject('IPagoRepository')
    private readonly pagoRepository: IPagoRepository,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

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
  pagosRegistrados.push({ ...pago, monto: new Decimal(Number(pago.monto) + abono), estado: pago.estado });
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
  pagosRegistrados.push({ ...pago, monto: new Decimal(Number(pago.monto) + abono), estado: pago.estado });
    }

    // Si aún queda saldo, registrar como nuevo pago extra
    if (montoRestante > 0) {
      // Convertir montoRestante a Decimal
      const { Decimal } = await import('@prisma/client/runtime/library');
      const nuevoPago = await this.pagoRepository.create({
        prestamoId: dto.prestamoId,
        fecha: dto.fecha,
        monto: new Decimal(montoRestante),
        estado: 'ACTIVO',
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
    if (!pago || pago.estado !== 'ACTIVO') throw new NotFoundException('Pago no encontrado');
    return pago;
  }

  /**
   * Obtiene préstamos en mora por más de 30 días
   */
  async prestamosEnMora(): Promise<any[]> {
    const hoy = new Date();
    const fechaLimite = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
    // Buscar préstamos activos con pagos atrasados
    const prestamos = await this.prisma.prestamo.findMany({
      where: { estado: 'ACTIVO' },
      include: { pagos: true, cliente: true },
    });
    return prestamos.filter(prestamo => {
      return prestamo.pagos.some(pago => new Date(pago.fecha) < fechaLimite && Number(pago.monto) < (Number(prestamo.monto) / prestamo.plazoDias));
    });
  }

  /**
   * Historial de pagos cancelados
   */
  async historialPagosCancelados(): Promise<Pago[]> {
    // Buscar pagos de préstamos cancelados
    const prestamosCancelados = await this.prisma.prestamo.findMany({
      where: { estado: 'CANCELADO' },
      include: { pagos: true },
    });
  // Los pagos de préstamos cancelados pueden no tener estado, así que los marcamos como ACTIVO por defecto
  return prestamosCancelados.flatMap(p => p.pagos.map(pg => ({ ...pg, estado: pg.estado ?? 'ACTIVO' })));
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
