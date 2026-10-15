import {
  CallHandler, ConflictException, ExecutionContext, Injectable, NestInterceptor, UnprocessableEntityException,
} from '@nestjs/common';
import { Observable, from, of, switchMap, map, catchError, throwError } from 'rxjs';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';

const METODOS = new Set(['POST', 'PUT', 'PATCH']);
const FORMATO_CLAVE = /^[A-Za-z0-9-]{8,80}$/;

/**
 * Idempotencia por cabecera `X-Idempotency-Key` (opcional).
 *
 * La app genera una clave por operación y la reutiliza si la reenvía (cola offline,
 * reintento tras un corte). La primera petición se ejecuta y su respuesta se guarda;
 * las repeticiones devuelven esa misma respuesta sin volver a ejecutar, así un pago
 * no se registra dos veces aunque la respuesta original se haya perdido.
 */
@Injectable()
export class IdempotenciaInterceptor implements NestInterceptor {
  constructor(private readonly prisma: TenantPrismaService) {}

  private get tabla() {
    return (this.prisma.client as any).solicitudIdempotente;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req  = http.getRequest();
    const res  = http.getResponse();
    const clave: string | undefined = req.headers?.['x-idempotency-key'];

    if (!clave || !METODOS.has(req.method) || !FORMATO_CLAVE.test(clave)) return next.handle();

    const ruta = `${req.method} ${req.path ?? req.url}`;

    return from(this.reservar(clave, ruta, req.user?.id ?? null)).pipe(
      switchMap(previa => {
        if (previa) {
          // Repetición de una operación ya completada: misma respuesta, sin re-ejecutar
          res.status(previa.status ?? 200);
          return of(previa.respuesta);
        }
        return next.handle().pipe(
          // Guarda la respuesta antes de devolverla, para que un reintento inmediato la encuentre
          switchMap(respuesta =>
            from(this.tabla.update({
              where: { clave },
              data:  { estado: 'COMPLETADO', status: res.statusCode, respuesta: respuesta ?? null },
            })).pipe(map(() => respuesta)),
          ),
          catchError(err =>
            // Falló: se libera la clave para que el cliente pueda reintentar
            from(this.tabla.delete({ where: { clave } }).catch(() => undefined)).pipe(switchMap(() => throwError(() => err))),
          ),
        );
      }),
    );
  }

  /** Reserva la clave. Devuelve la solicitud previa si ya se completó. */
  private async reservar(clave: string, ruta: string, usuarioId: number | null): Promise<{ status: number | null; respuesta: any } | null> {
    try {
      await this.tabla.create({ data: { clave, ruta, usuarioId, estado: 'EN_PROCESO' } });
      return null;
    } catch (err: any) {
      if (err?.code !== 'P2002') throw err;
    }
    const previa = await this.tabla.findUnique({ where: { clave } });
    if (!previa) return this.reservar(clave, ruta, usuarioId); // se liberó entre medias
    if (previa.ruta !== ruta) {
      throw new UnprocessableEntityException('La clave de idempotencia ya se usó para otra operación');
    }
    if (previa.estado !== 'COMPLETADO') {
      throw new ConflictException('Esta operación ya se está procesando, espera unos segundos');
    }
    return previa;
  }
}
