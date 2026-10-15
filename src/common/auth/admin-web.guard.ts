import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/**
 * Restringe una acción al panel de administración web, que envía la cabecera
 * `X-Client: admin-web`. Es una regla de producto (la app no elimina), no un
 * control de seguridad: siempre se usa junto con el rol admin.
 */
@Injectable()
export class AdminWebGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (req.headers?.['x-client'] === 'admin-web') return true;
    throw new ForbiddenException('Esta acción solo está disponible desde el panel de administración');
  }
}
