import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly ctx: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request    = context.switchToHttp().getRequest();
    const schemaName: string | undefined = request.user?.schemaName;
    // tenantId puede ser 0 si el JWT fue emitido antes de que se guardara correctamente.
    // Activamos el contexto con solo schemaName; LimitesService tiene fallback al
    // esquema del tenant para cuando tenantId sea 0.
    const tenantId:  number = Number(request.user?.tenantId ?? 0);

    if (!schemaName) {
      return next.handle();
    }

    return new Observable((observer) => {
      this.ctx.run({ schemaName, tenantId }, () => {
        next.handle().subscribe({
          next:     (val) => observer.next(val),
          error:    (err) => observer.error(err),
          complete: ()    => observer.complete(),
        });
      });
    });
  }
}
