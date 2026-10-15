import { ForbiddenException, HttpException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService.login', () => {
  let main: any;
  let usuario: any;
  let svc: AuthService;
  const dto = { schemaName: 'tenant_x', email: 'a@b.co', password: 'clave-correcta' };

  beforeEach(async () => {
    usuario = { id: 1, email: dto.email, role: 'ADMIN', nombre: 'A', active: true, password: await bcrypt.hash('clave-correcta', 4) };
    main = { tenant: { findUnique: jest.fn().mockResolvedValue({ id: 3, estado: 'ACTIVO' }) } };
    const tenantPrisma = { forSchema: () => ({ user: { findUnique: jest.fn().mockResolvedValue(usuario) } }) };
    svc = new AuthService({ sign: () => 'jwt' } as any, main, tenantPrisma as any);
  });

  it('una empresa cancelada o suspendida no puede iniciar sesión', async () => {
    main.tenant.findUnique.mockResolvedValue({ id: 3, estado: 'CANCELADO' });
    await expect(svc.login(dto, '1.1.1.1')).rejects.toBeInstanceOf(ForbiddenException);
    main.tenant.findUnique.mockResolvedValue({ id: 3, estado: 'SUSPENDIDO' });
    await expect(svc.login(dto, '1.1.1.1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('tras 10 intentos fallidos responde 429 aunque la clave sea correcta', async () => {
    for (let i = 0; i < 10; i++) {
      await expect(svc.login({ ...dto, password: 'mal-mal-mal' }, '2.2.2.2')).rejects.toBeInstanceOf(UnauthorizedException);
    }
    const err = await svc.login(dto, '2.2.2.2').catch(e => e);
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(429);
  });

  it('otra IP o un acierto previo no quedan bloqueados', async () => {
    await expect(svc.login({ ...dto, password: 'mal-mal-mal' }, '3.3.3.3')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(svc.login(dto, '3.3.3.3')).resolves.toMatchObject({ access_token: 'jwt' });
    await expect(svc.login(dto, '4.4.4.4')).resolves.toMatchObject({ access_token: 'jwt' });
  });
});
