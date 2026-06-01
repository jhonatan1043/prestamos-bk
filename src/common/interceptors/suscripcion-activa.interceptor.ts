import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from, switchMap } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';

/**
 * Interceptor de solo-lectura cuando el plan del tenant está vencido.
 *
 * Lee la suscripción del ESQUEMA PRINCIPAL (tst.Suscripcion) usando el
 * tenantId del JWT — que es la fuente de verdad para facturación/renovaciones.
 * Así funciona correctamente tanto en la suscripción inicial como tras renovar.
 *
 * Reglas:
 *  - Peticiones GET → siempre permitidas.
 *  - Peticiones de escritura (POST/PUT/PATCH/DELETE) → verifica suscripción activa.
 *  - Rutas exentas: /auth, /payments, /tenants, /health,
 *    POST /suscripciones/activar y POST /suscripciones/renovar.
 */
@Injectable()
export class SuscripcionActivaInterceptor implements NestInterceptor {
  private static readonly EXEMPT_PREFIXES = [
    '/auth',
    '/payments',
    '/tenants',
    '/health',
  ];

  private static readonly EXEMPT_SUFFIXES = [
    '/suscripciones/activar',
    '/suscripciones/renovar',
  ];

  private static readonly WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantPrisma: TenantPrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<any>();

    // Solo bloquear escrituras
    if (!SuscripcionActivaInterceptor.WRITE_METHODS.has(req.method)) {
      return next.handle();
    }

    // Rutas públicas (sin usuario autenticado) → pasar
    if (!req.user?.schemaName) return next.handle();
    const tenantId: number = Number(req.user?.tenantId ?? 0);

    // Rutas exentas
    const path: string = req.path ?? req.url ?? '';
    if (
      SuscripcionActivaInterceptor.EXEMPT_PREFIXES.some(p => path.startsWith(p)) ||
      SuscripcionActivaInterceptor.EXEMPT_SUFFIXES.some(s => path.endsWith(s))
    ) {
      return next.handle();
    }

    return from(this.verificarSuscripcion(tenantId)).pipe(
      switchMap(() => next.handle()),
    );
  }

  private async verificarSuscripcion(tenantId: number): Promise<void> {
    const filtroFechaOr = [{ fechaFin: null }, { fechaFin: { gt: new Date() } }];

    // 1. Esquema principal con tenantId (fuente de verdad post-renovación)
    if (tenantId > 0) {
      const sus = await this.prisma.suscripcion.findFirst({
        where: { tenantId, estado: 'ACTIVA', OR: filtroFechaOr },
      });
      if (sus) return; // ✅
    }

    // 2. Fallback: esquema del tenant (JWTs sin tenantId o tenantId=0)
    try {
      const sus = await this.tenantPrisma.suscripcion.findFirst({
        where: { estado: 'ACTIVA', OR: filtroFechaOr },
      });
      if (sus) return; // ✅
    } catch { /* esquema no disponible */ }

    throw new ForbiddenException({
      code:    'PLAN_VENCIDO',
      message: 'Tu plan ha vencido. Solo puedes consultar información. Renueva tu suscripción para continuar operando.',
    });
  }
}
