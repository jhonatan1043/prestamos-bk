/**
 * Roles del sistema.
 *
 *  - superadmin: dueño de la plataforma. Solo es válido si el usuario inició
 *    sesión en el esquema principal (MAIN_SCHEMA); así un admin de empresa no
 *    puede auto-asignarse el rol dentro de su propio esquema.
 *  - admin:      administrador de una empresa (acepta 'ADMIN' / 'ADMINISTRADOR').
 *  - user:       cobrador / usuario normal de una empresa.
 */
export type Rol = 'superadmin' | 'admin' | 'user';

const ALIAS_ADMIN = new Set(['admin', 'administrador']);

/** Roles que un admin de empresa puede asignar al crear/editar usuarios. */
export const ROLES_ASIGNABLES = /^(admin|administrador|user|usuario|cobrador)$/i;

export function mainSchema(): string {
  return process.env.MAIN_SCHEMA ?? 'master';
}

/** Normaliza el usuario del JWT (req.user) a un rol del sistema. */
export function rolDe(user: any): Rol | null {
  if (!user) return null;
  const raw = (user.role ?? (Array.isArray(user.roles) ? user.roles[0] : user.roles) ?? '')
    .toString()
    .toLowerCase();
  if (raw === 'superadmin') {
    return user.schemaName === mainSchema() ? 'superadmin' : 'user';
  }
  if (ALIAS_ADMIN.has(raw)) return 'admin';
  return 'user';
}

export function esSuperAdmin(user: any): boolean {
  return rolDe(user) === 'superadmin';
}

/** true si el usuario es admin de su empresa (o superadmin). */
export function esAdmin(user: any): boolean {
  const rol = rolDe(user);
  return rol === 'admin' || rol === 'superadmin';
}
