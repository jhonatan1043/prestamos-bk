import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TenantPrismaService } from '../../../common/tenant/tenant-prisma.service';
import { mainSchema } from '../../../common/auth/roles';
import { ConsultaPortalPrestamosDto } from './dto/consulta-portal-prestamos.dto';

const MAX_FALLOS    = 10;
const VENTANA_MS    = 15 * 60_000;
const NO_ENCONTRADO = 'No se encontró información con esos datos';
const BORRADO       = 'BORRADO';

/**
 * Consulta pública del cliente final ("Mis préstamos"): identificación + últimos
 * 4 dígitos del teléfono registrado. Responde siempre el mismo 404 para no
 * revelar si la empresa o el cliente existen, y limita los fallos por IP.
 */
@Injectable()
export class PrestamoPortalService {
  private readonly fallos = new Map<string, number[]>();

  constructor(
    private readonly mainPrisma:   PrismaService,
    private readonly tenantPrisma: TenantPrismaService,
  ) {}

  async consultar(dto: ConsultaPortalPrestamosDto, ip: string) {
    const clave = ip || 'desconocida';
    if (this.fallosRecientes(clave) >= MAX_FALLOS) {
      throw new HttpException('Demasiados intentos, intenta más tarde', HttpStatus.TOO_MANY_REQUESTS);
    }

    try {
      return await this.buscar(dto);
    } catch (err) {
      if (err instanceof NotFoundException) this.registrarFallo(clave);
      throw err;
    }
  }

  private async buscar(dto: ConsultaPortalPrestamosDto) {
    if (dto.schemaName === mainSchema()) throw new NotFoundException(NO_ENCONTRADO);
    const tenant = await this.mainPrisma.tenant.findUnique({ where: { schemaName: dto.schemaName }, select: { id: true } });
    if (!tenant) throw new NotFoundException(NO_ENCONTRADO);

    const db = this.tenantPrisma.forSchema(dto.schemaName);
    const cliente = await db.cliente.findFirst({
      where:  { identificacion: dto.identificacion, active: true },
      select: { id: true, nombres: true, apellidos: true, telefono: true },
    });
    const digitos = (cliente?.telefono ?? '').replace(/\D/g, '');
    if (!cliente || digitos.length < 4 || digitos.slice(-4) !== dto.ultimosTelefono) {
      throw new NotFoundException(NO_ENCONTRADO);
    }

    const prestamos = await db.prestamo.findMany({
      where:   { clienteId: cliente.id, estado: { nombre: { not: BORRADO } } },
      include: { estado: true, pagos: { include: { estado: true }, orderBy: { fecha: 'asc' } } },
      orderBy: { fechaInicio: 'desc' },
    });

    return {
      cliente:   { nombres: cliente.nombres, apellidos: cliente.apellidos },
      prestamos: prestamos.map(p => {
        const pagos       = p.pagos.filter(pg => pg.estado?.nombre !== BORRADO && Number(pg.monto) > 0);
        const totalPagado = pagos.reduce((s, pg) => s + Number(pg.monto), 0);
        const total       = Number(p.totalConIntereses ?? p.monto);
        return {
          codigo:            p.codigo,
          estado:            p.estado?.nombre ?? '',
          tipoPrestamo:      p.tipoPrestamo,
          tipoPlazo:         p.tipoPlazo,
          plazo:             p.plazoDias,
          tasa:              p.tasa,
          fechaInicio:       p.fechaInicio,
          monto:             Number(p.monto),
          totalConIntereses: total,
          totalPagado,
          saldoPendiente:    Math.max(0, total - totalPagado),
          pagos:             pagos.map(pg => ({ fecha: pg.fecha, monto: Number(pg.monto) })),
        };
      }),
    };
  }

  private fallosRecientes(clave: string): number {
    const limite   = Date.now() - VENTANA_MS;
    const vigentes = (this.fallos.get(clave) ?? []).filter(t => t > limite);
    if (vigentes.length) this.fallos.set(clave, vigentes);
    else this.fallos.delete(clave);
    return vigentes.length;
  }

  private registrarFallo(clave: string) {
    this.fallos.set(clave, [...(this.fallos.get(clave) ?? []), Date.now()]);
  }
}
