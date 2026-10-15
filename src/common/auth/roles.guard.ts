import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Rol, rolDe } from './roles';

export const ROLES_KEY = 'roles';

/**
 * Restringe un endpoint (o controlador) a ciertos roles.
 * El superadmin siempre pasa. Debe usarse junto con JwtAuthGuard:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);

/** Atajo: solo el superadmin de la plataforma. */
export const SuperAdmin = () => Roles('superadmin');

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const requeridos = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, targets);
    if (!requeridos || requeridos.length === 0) return true;

    const rol = rolDe(context.switchToHttp().getRequest().user);
    if (rol === 'superadmin' || (rol && requeridos.includes(rol))) return true;

    throw new ForbiddenException('No tienes permisos para realizar esta acción');
  }
}
