import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from, switchMap } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Interceptor de solo-lectura cuando el plan del tenant está vencido.
 *
 * FUENTE ÚNICA: consulta solo master.Suscripcion (esquema principal).
 * Si el JWT trae tenantId=0 (JWT legado), resuelve el id por schemaName
 * haciendo un lookup en master.Tenant — no depende del schema del tenant.
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
    private readonly prisma: PrismaService,   // esquema principal — fuente única
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

    const tenantId: number  = Number(req.user?.tenantId ?? 0);
    const schemaName: string = req.user.schemaName;

    return from(this.verificarSuscripcion(tenantId, schemaName)).pipe(
      switchMap(() => next.handle()),
    );
  }

  private async verificarSuscripcion(tenantId: number, schemaName: string): Promise<void> {
    // Resolver tenantId si viene como 0 en el JWT (JWT legado)
    let resolvedId = tenantId;
    if (!resolvedId && schemaName) {
      const tenant = await this.prisma.tenant.findUnique({
        where:  { schemaName },
        select: { id: true },
      });
      resolvedId = tenant?.id ?? 0;
    }

    if (resolvedId) {
      const sus = await this.prisma.suscripcion.findFirst({
        where: {
          tenantId: resolvedId,
          estado:   'ACTIVA',
          OR: [{ fechaFin: null }, { fechaFin: { gt: new Date() } }],
        },
      });
      if (sus) return; // ✅ Plan activo — permitir escritura
    }

    throw new ForbiddenException({
      code:    'PLAN_VENCIDO',
      message: 'Tu plan ha vencido. Solo puedes consultar información. Renueva tu suscripción para continuar operando.',
    });
  }
}
