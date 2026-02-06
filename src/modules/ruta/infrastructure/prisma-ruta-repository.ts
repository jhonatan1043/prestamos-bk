import { RutaResumenDetalladoDto, ClienteDetalleDto, PrestamoDetalleDto } from '../application/dto/ruta-resumen-detallado.dto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { IRutaRepository } from '../domain/repositories/ruta.repository';
import { Ruta } from '../domain/entities/ruta.entity';

@Injectable()
export class PrismaRutaRepository implements IRutaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Ruta[]> {
    const rutas = await this.prisma.ruta.findMany();
    return rutas.map(r => {
      const ruta = new Ruta();
      ruta.id = r.id;
      ruta.nombre = r.nombre;
      ruta.sector = r.sector;
      ruta.cobradorId = r.cobradorId;
      return ruta;
    });
  }

  async create(ruta: Ruta): Promise<Ruta> {
    const created = await this.prisma.ruta.create({
      data: {
        nombre: ruta.nombre,
        sector: ruta.sector,
        cobradorId: ruta.cobradorId,
      },
    });
    const nuevaRuta = new Ruta();
    nuevaRuta.id = created.id;
    nuevaRuta.nombre = created.nombre;
    nuevaRuta.sector = created.sector;
    nuevaRuta.cobradorId = created.cobradorId;
    return nuevaRuta;
  }

    async findAllResumenDetallado(): Promise<RutaResumenDetalladoDto[]> {
    const rutas = await this.prisma.ruta.findMany({
      include: {
        clientes: {
          include: {
            prestamos: {
              include: {
                pagos: true
              }
            }
          }
        },
        cobrador: true
      }
    });
    return rutas.map(r => {
      const cantidadClientes = r.clientes.length;
      let totalPrestamos = 0;
      let totalPagos = 0;
      let saldoPendiente = 0;
      const clientes: ClienteDetalleDto[] = r.clientes.map(cliente => {
        const prestamos: PrestamoDetalleDto[] = cliente.prestamos.map(prestamo => {
          const valorAPagar = Number(prestamo.monto) + (Number(prestamo.monto) * prestamo.tasa / 100);
          const pagosRealizados = prestamo.pagos.reduce((acc, pago) => acc + Number(pago.monto), 0);
          const saldoRestante = valorAPagar - pagosRealizados;
          totalPrestamos += valorAPagar;
          totalPagos += pagosRealizados;
          saldoPendiente += saldoRestante;
          return {
            prestamoId: prestamo.id,
            monto: Number(prestamo.monto),
            tasa: prestamo.tasa,
            valorAPagar,
            saldoRestante
          };
        });
        return {
          clienteId: cliente.id,
          nombres: cliente.nombres,
          apellidos: cliente.apellidos,
          prestamos
        };
      });
      return {
        rutaId: r.id,
        nombre: r.nombre,
        sector: r.sector,
        cobradorId: r.cobradorId,
        cobradorNombre: r.cobrador?.nombre || '',
        cantidadClientes,
        totalPrestamos,
        totalPagos,
        saldoPendiente,
        clientes
      };
    });
  }
}
