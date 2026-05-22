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
    const request   = context.switchToHttp().getRequest();
    const schemaName: string | undefined = request.user?.schemaName;
    const tenantId:   number | undefined = request.user?.tenantId;

    if (!schemaName || !tenantId) {
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
