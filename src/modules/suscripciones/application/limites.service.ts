import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
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
    private readonly prisma: PrismaService,
  ) {}

  // ─── Método principal ──────────────────────────────────────────────────────

  async verificarUsuarios(): Promise<void> {
    const { plan } = await this.obtenerPlanActivo();
    if (plan.maxUsuarios === -1) return;

    const total = await this.prisma.user.count();
    if (total >= plan.maxUsuarios) {
      await this.lanzarLimiteExcedido('usuarios', plan.maxUsuarios, plan);
    }
  }

  async verificarClientes(): Promise<void> {
    const { plan } = await this.obtenerPlanActivo();
    if (plan.maxClientes === -1) return;

    const total = await this.prisma.cliente.count({ where: { active: true } });
    if (total >= plan.maxClientes) {
      await this.lanzarLimiteExcedido('clientes', plan.maxClientes, plan);
    }
  }

  async verificarPrestamos(clienteId: number): Promise<void> {
    const { plan } = await this.obtenerPlanActivo();
    if (plan.maxPrestamosPorCliente === -1) return;

    const total = await this.prisma.prestamo.count({ where: { clienteId } });
    if (total >= plan.maxPrestamosPorCliente) {
      await this.lanzarLimiteExcedido('prestamos', plan.maxPrestamosPorCliente, plan);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async obtenerPlanActivo(): Promise<{ plan: Plan }> {
    const suscripcion = await this.suscripcionRepository.findActiva();

    // Sin suscripción activa → plan por defecto ultra-restrictivo
    if (!suscripcion?.plan) {
      return {
        plan: {
          id: 0,
          nombre: 'Sin plan',
          maxUsuarios: 1,
          maxClientes: 10,
          maxPrestamosPorCliente: 1,
          precio: 0,
          activo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
    }

    return { plan: suscripcion.plan as Plan };
  }

  private async lanzarLimiteExcedido(
    recurso: 'usuarios' | 'clientes' | 'prestamos',
    limiteActual: number,
    planActual: Plan,
  ): Promise<never> {
    // Obtener planes superiores que resuelvan el límite excedido
    const todosLosPlanes = await this.planRepository.findActivos();

    const planesSuperiores = todosLosPlanes.filter(p => {
      if (p.id === planActual.id) return false;
      const camposLimite: Record<string, number> = {
        usuarios: p.maxUsuarios,
        clientes: p.maxClientes,
        prestamos: p.maxPrestamosPorCliente,
      };
      const limite = camposLimite[recurso];
      return limite === -1 || limite > limiteActual;
    }).sort((a, b) => Number(a.precio) - Number(b.precio));

    throw new LimiteExcedidoException({
      recurso,
      limiteActual,
      planActual,
      planesSuperiores,
    });
  }

  // ─── Info pública ─────────────────────────────────────────────────────────

  async obtenerEstadoActual() {
    const suscripcion = await this.suscripcionRepository.findActiva();
    if (!suscripcion?.plan) {
      return { suscripcion: null, plan: null, uso: null };
    }

    const plan = suscripcion.plan as Plan;
    const [usuarios, clientes, prestamosTotal] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.cliente.count({ where: { active: true } }),
      this.prisma.prestamo.count(),
    ]);

    return {
      suscripcion: {
        id: suscripcion.id,
        estado: suscripcion.estado,
        fechaInicio: suscripcion.fechaInicio,
        fechaFin: suscripcion.fechaFin,
      },
      plan: {
        nombre: plan.nombre,
        descripcion: plan.descripcion,
        precio: plan.precio,
        limites: {
          maxUsuarios: plan.maxUsuarios,
          maxClientes: plan.maxClientes,
          maxPrestamosPorCliente: plan.maxPrestamosPorCliente,
        },
      },
      uso: {
        usuarios: { actual: usuarios,  limite: plan.maxUsuarios,            porcentaje: plan.maxUsuarios  === -1 ? 0 : Math.round((usuarios  / plan.maxUsuarios)  * 100) },
        clientes: { actual: clientes,  limite: plan.maxClientes,            porcentaje: plan.maxClientes  === -1 ? 0 : Math.round((clientes  / plan.maxClientes)  * 100) },
        prestamos: { actual: prestamosTotal, limite: plan.maxPrestamosPorCliente, porcentaje: null },
      },
    };
  }
}
