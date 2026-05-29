import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from, switchMap } from 'rxjs';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

/**
 * Interceptor de solo-lectura cuando el plan del tenant está vencido.
 *
 * Reglas:
 *  - Peticiones GET → siempre permitidas.
 *  - Peticiones de escritura (POST/PUT/PATCH/DELETE) → verifica suscripción activa.
 *  - Rutas exentas: /auth, /payments, /tenants, /health,
 *    POST /suscripciones/activar y POST /suscripciones/renovar
 *    (sin estas excepciones el usuario nunca podría renovar su plan).
 *
 * Se registra como APP_INTERCEPTOR DESPUÉS de TenantInterceptor, por lo que
 * el AsyncLocalStorage del tenant ya está activo cuando este interceptor corre.
 */
@Injectable()
export class SuscripcionActivaInterceptor implements NestInterceptor {
  // Prefijos de ruta que NUNCA se bloquean (incluso en mutaciones)
  private static readonly EXEMPT_PREFIXES = [
    '/auth',
    '/payments',
    '/tenants',
    '/health',
  ];

  // Sufijos de ruta exactos exentos
  private static readonly EXEMPT_SUFFIXES = [
    '/suscripciones/activar',
    '/suscripciones/renovar',
  ];

  private static readonly WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

  constructor(
    private readonly prisma: TenantPrismaService,
    private readonly ctx: TenantContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<any>();

    // Solo bloquear escrituras
    if (!SuscripcionActivaInterceptor.WRITE_METHODS.has(req.method)) {
      return next.handle();
    }

    // Rutas públicas (sin usuario autenticado) → pasar
    if (!req.user?.schemaName) return next.handle();

    // Rutas exentas
    const path: string = req.path ?? req.url ?? '';
    if (
      SuscripcionActivaInterceptor.EXEMPT_PREFIXES.some(p => path.startsWith(p)) ||
      SuscripcionActivaInterceptor.EXEMPT_SUFFIXES.some(s => path.endsWith(s))
    ) {
      return next.handle();
    }

    // Sin contexto de tenant activo → pasar (rutas de admin global)
    if (!this.ctx.getTenantId()) return next.handle();

    // Verificar suscripción y luego proceder
    return from(this.verificarSuscripcion()).pipe(
      switchMap(() => next.handle()),
    );
  }

  private async verificarSuscripcion(): Promise<void> {
    const suscripcion = await this.prisma.suscripcion.findFirst({
      where: {
        estado: 'ACTIVA',
        OR: [
          { fechaFin: null },
          { fechaFin: { gt: new Date() } },
        ],
      },
      orderBy: { fechaInicio: 'desc' },
    });

    if (!suscripcion) {
      throw new ForbiddenException({
        code:    'PLAN_VENCIDO',
        message: 'Tu plan ha vencido. Solo puedes consultar información. Renueva tu suscripción para continuar operando.',
      });
    }
  }
}
