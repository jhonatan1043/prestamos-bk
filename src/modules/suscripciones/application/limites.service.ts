import { Injectable, Inject } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/tenant/tenant-prisma.service';
import { TenantContextService } from '../../../common/tenant/tenant-context.service';
import type { ISuscripcionRepository } from '../domain/repositories/suscripcion.repository';
import type { IPlanRepository } from '../domain/repositories/plan.repository';
import { LimiteExcedidoException } from '../domain/exceptions/limite-excedido.exception';
import { Plan } from '../domain/entities/plan.entity';

@Injectable()
export class LimitesService {
  constructor(
    @Inject('ISuscripcionRepository')
    private readonly suscripcionRepository: ISuscripcionRepository,
    @Inject('IPlanRepository')
    private readonly planRepository: IPlanRepository,
    private readonly prisma: TenantPrismaService,
    private readonly tenantCtx: TenantContextService,
  ) {}

  // ─── Verificaciones de límites ────────────────────────────────────────────

  async verificarUsuarios(): Promise<void> {
    const { plan } = await this.obtenerPlanActivo();
    if (plan.maxUsuarios === -1) return;
    const total = await this.prisma.user.count();
    if (total >= plan.maxUsuarios) await this.lanzarLimiteExcedido('usuarios', plan.maxUsuarios, plan);
  }

  async verificarClientes(): Promise<void> {
    const { plan } = await this.obtenerPlanActivo();
    if (plan.maxClientes === -1) return;
    const total = await this.prisma.cliente.count({ where: { active: true } });
    if (total >= plan.maxClientes) await this.lanzarLimiteExcedido('clientes', plan.maxClientes, plan);
  }

  async verificarPrestamos(clienteId: number): Promise<void> {
    const { plan } = await this.obtenerPlanActivo();
    if (plan.maxPrestamosPorCliente === -1) return;
    const total = await this.prisma.prestamo.count({ where: { clienteId } });
    if (total >= plan.maxPrestamosPorCliente) await this.lanzarLimiteExcedido('prestamos', plan.maxPrestamosPorCliente, plan);
  }

  // ─── Plan activo del tenant ───────────────────────────────────────────────

  private async obtenerPlanActivo(): Promise<{ plan: Plan; suscripcionId: number | null }> {
    const tenantId = this.tenantCtx.getTenantId();

    if (!tenantId) {
      // Sin contexto de tenant (ej: rutas de admin) → restricción máxima
      return { plan: this.planFallback(), suscripcionId: null };
    }

    const suscripcion = await this.suscripcionRepository.findActiva(tenantId);

    if (!suscripcion?.plan) {
      return { plan: this.planFallback(), suscripcionId: null };
    }

    // Verificar si la suscripción venció
    if (suscripcion.fechaFin && new Date() > suscripcion.fechaFin) {
      // Marcar como vencida automáticamente
      await this.suscripcionRepository.update(suscripcion.id, { estado: 'VENCIDA' });
      return { plan: this.planFallback(), suscripcionId: suscripcion.id };
    }

    return { plan: suscripcion.plan as Plan, suscripcionId: suscripcion.id };
  }

  private planFallback(): Plan {
    return {
      id: 0, nombre: 'Sin plan activo',
      maxUsuarios: 1, maxClientes: 10, maxPrestamosPorCliente: 1,
      precio: 0, activo: true, createdAt: new Date(), updatedAt: new Date(),
    };
  }

  // ─── Info pública ─────────────────────────────────────────────────────────

  async obtenerEstadoActual() {
    const tenantId = this.tenantCtx.getTenantId();
    if (!tenantId) return { suscripcion: null, plan: null, uso: null };

    const suscripcion = await this.suscripcionRepository.findActiva(tenantId);
    if (!suscripcion?.plan) return { suscripcion: null, plan: null, uso: null };

    const plan = suscripcion.plan as Plan;
    const [usuarios, clientes, prestamosTotal] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.cliente.count({ where: { active: true } }),
      this.prisma.prestamo.count(),
    ]);

    const pct = (val: number, max: number) =>
      max === -1 ? 0 : Math.round((val / max) * 100);

    return {
      suscripcion: {
        id:          suscripcion.id,
        estado:      suscripcion.estado,
        fechaInicio: suscripcion.fechaInicio,
        fechaFin:    suscripcion.fechaFin ?? null,
        vence:       suscripcion.fechaFin
          ? `${Math.ceil((suscripcion.fechaFin.getTime() - Date.now()) / 86_400_000)} días`
          : 'No vence',
      },
      plan: {
        nombre:      plan.nombre,
        descripcion: plan.descripcion,
        precio:      plan.precio,
        limites: {
          maxUsuarios:            plan.maxUsuarios,
          maxClientes:            plan.maxClientes,
          maxPrestamosPorCliente: plan.maxPrestamosPorCliente,
        },
      },
      uso: {
        usuarios:  { actual: usuarios,       limite: plan.maxUsuarios,            porcentaje: pct(usuarios,       plan.maxUsuarios) },
        clientes:  { actual: clientes,       limite: plan.maxClientes,            porcentaje: pct(clientes,       plan.maxClientes) },
        prestamos: { actual: prestamosTotal, limite: plan.maxPrestamosPorCliente, porcentaje: null },
      },
    };
  }

  // ─── Helper ───────────────────────────────────────────────────────────────

  private async lanzarLimiteExcedido(
    recurso: 'usuarios' | 'clientes' | 'prestamos',
    limiteActual: number,
    planActual: Plan,
  ): Promise<never> {
    const todosLosPlanes = await this.planRepository.findActivos();
    const planesSuperiores = todosLosPlanes
      .filter(p => {
        if (p.id === planActual.id) return false;
        const campo: Record<string, number> = {
          usuarios:  p.maxUsuarios,
          clientes:  p.maxClientes,
          prestamos: p.maxPrestamosPorCliente,
        };
        const l = campo[recurso];
        return l === -1 || l > limiteActual;
      })
      .sort((a, b) => Number(a.precio) - Number(b.precio));

    throw new LimiteExcedidoException({ recurso, limiteActual, planActual, planesSuperiores });
  }
}
