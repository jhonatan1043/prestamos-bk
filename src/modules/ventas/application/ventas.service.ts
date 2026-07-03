import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TenantPrismaService } from '../../../common/tenant/tenant-prisma.service';
import { CreateVentaDto } from './dto/create-venta.dto';

@Injectable()
export class VentasService {
  constructor(private readonly prisma: TenantPrismaService) {}

  // ── Crear venta y generar cuotas automáticamente ──────────────────────────

  async create(dto: CreateVentaDto, usuarioId: number) {
    // Validar stock de cada ítem
    for (const item of dto.items) {
      const producto = await this.prisma.producto.findUnique({
        where: { id: item.productoId },
      });
      if (!producto) throw new NotFoundException(`Producto ${item.productoId} no encontrado`);
      if (!producto.active) throw new BadRequestException(`Producto ${producto.nombre} no está activo`);
      if (producto.stock < item.cantidad)
        throw new BadRequestException(
          `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock}, solicitado: ${item.cantidad}`,
        );
    }

    // Calcular total
    const totalVenta = dto.items.reduce(
      (sum, i) => sum + i.precioUnit * i.cantidad,
      0,
    );
    const cuotaMonto = Math.ceil(totalVenta / dto.numeroCuotas);

    // Código único
    const codigo = `VTA-${Date.now()}`;

    const fechaInicio = new Date(dto.fechaInicio);

    // Crear venta + ítems + cuotas en una transacción
    const venta = await this.prisma.$transaction(async (tx) => {
      // 1. Crear la venta (estadoId=1 = ACTIVO)
      const nuevaVenta = await tx.venta.create({
        data: {
          codigo,
          clienteId:    dto.clienteId,
          usuarioId,
          fechaInicio,
          totalVenta,
          cuotaMonto,
          numeroCuotas: dto.numeroCuotas,
          tipoPlazo:    dto.tipoPlazo,
          estadoId:     1,
          notas:        dto.notas ?? null,
          items: {
            create: dto.items.map((i) => ({
              productoId: i.productoId,
              cantidad:   i.cantidad,
              precioUnit: i.precioUnit,
              subtotal:   i.precioUnit * i.cantidad,
            })),
          },
        },
      });

      // 2. Generar cuotas según el plazo
      const cuotas = this._generarCuotas(
        nuevaVenta.id,
        fechaInicio,
        dto.tipoPlazo,
        dto.numeroCuotas,
        cuotaMonto,
      );
      await tx.cuotaVenta.createMany({ data: cuotas });

      // 3. Descontar stock
      for (const item of dto.items) {
        await tx.producto.update({
          where: { id: item.productoId },
          data: { stock: { decrement: item.cantidad } },
        });
      }

      return nuevaVenta;
    });

    return this.findOne(venta.id);
  }

  // ── Listar ventas ─────────────────────────────────────────────────────────

  async findAll() {
    return this.prisma.venta.findMany({
      include: {
        cliente: true,
        usuario: { select: { id: true, nombre: true, email: true } },
        estado:  true,
        items:   { include: { producto: true } },
        cuotas:  { include: { estado: true }, orderBy: { numeroCuota: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const v = await this.prisma.venta.findUnique({
      where: { id },
      include: {
        cliente: true,
        usuario: { select: { id: true, nombre: true, email: true } },
        estado:  true,
        items:   { include: { producto: true } },
        cuotas:  { include: { estado: true }, orderBy: { numeroCuota: 'asc' } },
      },
    });
    if (!v) throw new NotFoundException('Venta no encontrada');
    return v;
  }

  async findByCliente(clienteId: number) {
    return this.prisma.venta.findMany({
      where: { clienteId },
      include: {
        estado: true,
        items:  { include: { producto: true } },
        cuotas: { include: { estado: true }, orderBy: { numeroCuota: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Cobros del día (préstamos + cuotas de venta) ─────────────────────────

  async cobrosDelDia(fecha?: string) {
    const hoy = fecha ? new Date(fecha) : new Date();
    const inicio = new Date(hoy); inicio.setHours(0, 0, 0, 0);
    const fin    = new Date(hoy); fin.setHours(23, 59, 59, 999);

    const cuotas = await this.prisma.cuotaVenta.findMany({
      where: {
        fechaPago: { gte: inicio, lte: fin },
        estadoId:  1, // ACTIVO = pendiente
      },
      include: {
        venta: {
          include: {
            cliente: true,
            items:   { include: { producto: true } },
          },
        },
        estado: true,
      },
      orderBy: { fechaPago: 'asc' },
    });

    return cuotas;
  }

  // ── Pagar una cuota ───────────────────────────────────────────────────────

  async pagarCuota(cuotaId: number) {
    const cuota = await this.prisma.cuotaVenta.findUnique({
      where: { id: cuotaId },
      include: { venta: { include: { cuotas: true } } },
    });
    if (!cuota) throw new NotFoundException('Cuota no encontrada');
    if (cuota.estadoId !== 1)
      throw new BadRequestException('Esta cuota ya fue pagada o cancelada');

    await this.prisma.$transaction(async (tx) => {
      // 1. Marcar cuota como pagada (estadoId=3 = FINALIZADO)
      await tx.cuotaVenta.update({
        where: { id: cuotaId },
        data:  { estadoId: 3, pagadoEn: new Date() },
      });

      // 2. Verificar si todas las cuotas de la venta están pagas
      const pendientes = cuota.venta.cuotas.filter(
        (c) => c.id !== cuotaId && c.estadoId === 1,
      );
      if (pendientes.length === 0) {
        await tx.venta.update({
          where: { id: cuota.ventaId },
          data:  { estadoId: 3 }, // FINALIZADO
        });
      }
    });

    return this.findOne(cuota.ventaId);
  }

  // ── Resumen de cuotas pendientes de un cliente ────────────────────────────

  async cuotasPendientesPorCliente(clienteId: number) {
    return this.prisma.cuotaVenta.findMany({
      where: {
        estadoId: 1,
        venta: { clienteId, estadoId: 1 },
      },
      include: {
        venta: { include: { items: { include: { producto: true } } } },
      },
      orderBy: { fechaPago: 'asc' },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private _generarCuotas(
    ventaId: number,
    fechaInicio: Date,
    tipoPlazo: 'DIA' | 'SEMANA' | 'MES',
    numeroCuotas: number,
    monto: number,
  ) {
    const cuotas: {
      ventaId: number;
      numeroCuota: number;
      fechaPago: Date;
      monto: number;
      estadoId: number;
    }[] = [];

    for (let i = 1; i <= numeroCuotas; i++) {
      const fecha = new Date(fechaInicio);
      if (tipoPlazo === 'DIA')    fecha.setDate(fecha.getDate() + i);
      if (tipoPlazo === 'SEMANA') fecha.setDate(fecha.getDate() + i * 7);
      if (tipoPlazo === 'MES')    fecha.setMonth(fecha.getMonth() + i);

      cuotas.push({
        ventaId,
        numeroCuota: i,
        fechaPago:   fecha,
        monto,
        estadoId:    1, // ACTIVO
      });
    }
    return cuotas;
  }
}
