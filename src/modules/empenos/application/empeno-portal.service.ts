import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TenantPrismaService } from '../../../common/tenant/tenant-prisma.service';
import { mainSchema } from '../../../common/auth/roles';
import { estadoActual, liquidacionDe, num } from './empeno-calculo';
import { ConsultaPortalDto } from './dto/consulta-portal.dto';

const MAX_FALLOS   = 10;
const VENTANA_MS   = 15 * 60_000;
const NO_ENCONTRADO = 'No se encontró información con esos datos';

/**
 * Consulta pública del cliente final: identificación + código de consulta de
 * alguno de sus empeños. Responde siempre el mismo 404 para no revelar si la
 * empresa, el cliente o el código existen, y limita los fallos por IP.
 */
@Injectable()
export class EmpenoPortalService {
  private readonly fallos = new Map<string, number[]>();

  constructor(
    private readonly mainPrisma:   PrismaService,
    private readonly tenantPrisma: TenantPrismaService,
  ) {}

  async consultar(dto: ConsultaPortalDto, ip: string) {
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

  private async buscar(dto: ConsultaPortalDto) {
    if (dto.schemaName === mainSchema()) throw new NotFoundException(NO_ENCONTRADO);
    const tenant = await this.mainPrisma.tenant.findUnique({ where: { schemaName: dto.schemaName }, select: { id: true } });
    if (!tenant) throw new NotFoundException(NO_ENCONTRADO);

    const db = this.tenantPrisma.forSchema(dto.schemaName);
    // Puede haber más de un cliente activo con la misma identificación: se usa el
    // que tenga un empeño con ese código de consulta
    const clientes = await db.cliente.findMany({
      where:  { identificacion: dto.identificacion, active: true },
      select: { id: true, nombres: true, apellidos: true },
    });
    let cliente: { id: number; nombres: string; apellidos: string } | null = null;
    let empenos: any[] = [];
    for (const c of clientes) {
      const lista = await db.empeno.findMany({
        where:   { clienteId: c.id, deletedAt: null },
        include: { articulo: true, pagos: { where: { deletedAt: null } } },
        orderBy: { fechaIngreso: 'desc' },
      });
      if (lista.some(e => e.codigoConsulta === dto.codigoConsulta)) {
        cliente = c;
        empenos = lista;
        break;
      }
    }
    if (!cliente) throw new NotFoundException(NO_ENCONTRADO);

    return {
      cliente: { nombres: cliente.nombres, apellidos: cliente.apellidos },
      empenos: empenos.map(e => {
        const estado   = estadoActual(e);
        const vigente  = estado === 'ACTIVO' || estado === 'VENCIDO';
        const l        = vigente ? liquidacionDe(e) : null;
        return {
          codigo:       e.codigo,
          tipoArticulo: e.tipoArticulo,
          articulo: {
            descripcion: e.articulo?.descripcion ?? '',
            placa:       e.articulo?.placa ?? null,
            marca:       e.articulo?.marca ?? null,
            modelo:      e.articulo?.modelo ?? null,
          },
          fechaIngreso:      e.fechaIngreso,
          fechaMinima:       e.fechaMinima,
          fechaMaxima:       e.fechaMaxima,
          estado,
          montoPrestado:     num(e.montoPrestado),
          saldoCapital:      num(e.saldoCapital),
          interesAdeudado:   l?.interesAdeudado ?? 0,
          totalParaRescatar: l?.totalParaRescatar ?? 0,
        };
      }),
    };
  }

  private fallosRecientes(clave: string): number {
    const limite  = Date.now() - VENTANA_MS;
    const vigentes = (this.fallos.get(clave) ?? []).filter(t => t > limite);
    if (vigentes.length) this.fallos.set(clave, vigentes);
    else this.fallos.delete(clave);
    return vigentes.length;
  }

  private registrarFallo(clave: string) {
    this.fallos.set(clave, [...(this.fallos.get(clave) ?? []), Date.now()]);
  }
}
