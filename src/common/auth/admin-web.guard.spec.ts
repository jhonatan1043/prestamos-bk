import { ForbiddenException } from '@nestjs/common';
import { AdminWebGuard } from './admin-web.guard';

const ctx = (headers: Record<string, string>) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ headers }) }) }) as any;

describe('AdminWebGuard', () => {
  const guard = new AdminWebGuard();
  it('permite peticiones del panel web', () => {
    expect(guard.canActivate(ctx({ 'x-client': 'admin-web' }))).toBe(true);
  });
  it('rechaza peticiones sin cabecera', () => {
    expect(() => guard.canActivate(ctx({}))).toThrow(ForbiddenException);
  });
  it('rechaza peticiones de la app', () => {
    expect(() => guard.canActivate(ctx({ 'x-client': 'app' }))).toThrow(ForbiddenException);
  });
});
