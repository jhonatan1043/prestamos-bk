import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/tenant/tenant-prisma.service';
import { TenantContextService } from '../../../common/tenant/tenant-context.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { LimiteExcedidoException } from '../domain/exceptions/limite-excedido.exception';
import { Plan } from '../domain/entities/plan.entity';

/**
 * Verifica los límites del plan del tenant activo.
 *
 * La suscripción se consulta en el ESQUEMA PRINCIPAL (PrismaService) usando el
 * tenantId del contexto — que es la fuente de verdad para facturación/renovaciones.
 *
 * Los conteos de uso (clientes, usuarios, préstamos) se leen del ESQUEMA DEL TENANT
 * (TenantPrismaService) porque ahí viven los datos operativos.
 */
@Injectable()
export class LimitesService {
  constructor(
    private readonly prisma: TenantPrismaService,    // esquema tenant → conteos de uso
    private readonly mainPrisma: PrismaService,       // esquema principal → suscripción/plan
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

  /**
   * Busca el plan activo usando doble estrategia — ahora el esquema del tenant
   * está siempre sincronizado al activar/renovar, por lo que es suficiente
   * como fuente primaria. El esquema principal es el respaldo.
   *
   *  1. ESQUEMA DEL TENANT (TenantPrismaService):
   *     Simple, sin depender de tenantId en JWT.
   *     Siempre actualizado tras cada renovación/activación.
   *
   *  2. ESQUEMA PRINCIPAL (mainPrisma + tenantId):
   *     Respaldo cuando el esquema del tenant no tiene datos
   *     (tenants creados antes de la sincronización).
   */
  private async obtenerPlanActivo(): Promise<{ plan: Plan; suscripcionId: number | null }> {
    const now           = new Date();
    const filtroFechaOr = [{ fechaFin: null }, { fechaFin: { gt: now } }];

    // ── 1. Esquema del tenant (primario — simple, siempre disponible) ──────
    try {
      const sus = await this.prisma.suscripcion.findFirst({
        where:   { estado: 'ACTIVA', OR: filtroFechaOr },
        orderBy: { fechaInicio: 'desc' },
        include: { plan: true },
      }) as any;
      if (sus?.plan) return { plan: this.toPlain(sus.plan), suscripcionId: sus.id };
    } catch { /* esquema del tenant no disponible */ }

    // ── 2. Esquema principal (respaldo para tenants sin sincronización) ────
    const tenantId = this.tenantCtx.getTenantId();
    if (tenantId) {
      const sus = await this.mainPrisma.suscripcion.findFirst({
        where:   { tenantId, estado: 'ACTIVA', OR: filtroFechaOr },
        orderBy: { fechaInicio: 'desc' },
        include: { plan: true },
      }) as any;
      if (sus?.plan) return { plan: this.toPlain(sus.plan), suscripcionId: sus.id };
    }

    return { plan: this.planFallback(), suscripcionId: null };
  }

  private planFallback(): Plan {
    return {
      id: 0, nombre: 'Sin plan activo',
      maxUsuarios: 1, maxClientes: 10, maxPrestamosPorCliente: 1,
      precio: 0, duracionDias: 30, activo: true, createdAt: new Date(), updatedAt: new Date(),
    };
  }

  private toPlain(p: any): Plan {
    return {
      id:                     p.id,
      nombre:                 p.nombre,
      descripcion:            p.descripcion ?? undefined,
      maxUsuarios:            p.maxUsuarios,
      maxClientes:            p.maxClientes,
      maxPrestamosPorCliente: p.maxPrestamosPorCliente,
      precio:                 Number(p.precio),
      duracionDias:           p.duracionDias ?? 30,
      activo:                 p.activo,
      createdAt:              p.createdAt,
      updatedAt:              p.updatedAt,
    };
  }

  // ─── Info pública ─────────────────────────────────────────────────────────

  async obtenerEstadoActual() {
    const tenantId = this.tenantCtx.getTenantId();
    if (!tenantId) return { suscripcion: null, plan: null, uso: null };

    const now         = new Date();
    const filtroFechaOr = [{ fechaFin: null }, { fechaFin: { gt: now } }];

    // 1. Esquema principal (post-renovaciones)
    let suscripcion: any = await this.mainPrisma.suscripcion.findFirst({
      where:   { tenantId, estado: 'ACTIVA', OR: filtroFechaOr },
      orderBy: { fechaInicio: 'desc' },
      include: { plan: true },
    });

    // 2. Fallback al esquema del tenant si no hay resultados
    if (!suscripcion?.plan) {
      try {
        suscripcion = await this.prisma.suscripcion.findFirst({
          where:   { estado: 'ACTIVA', OR: filtroFechaOr },
          orderBy: { fechaInicio: 'desc' },
          include: { plan: true },
        });
      } catch { /* ignorar si esquema no disponible */ }
    }

    if (!suscripcion?.plan) return { suscripcion: null, plan: null, uso: null };

    const plan = this.toPlain(suscripcion.plan);
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
    // Obtener todos los planes del esquema del tenant (sembrados en la provisión)
    const todos = await this.prisma.plan.findMany({
      where:   { activo: true },
      orderBy: { precio: 'asc' },
    });

    const planesSuperiores = todos
      .map(p => this.toPlain(p))
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
