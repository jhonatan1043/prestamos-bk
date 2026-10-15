import { HttpException, NotFoundException } from '@nestjs/common';
import { EmpenoPortalService } from './empeno-portal.service';
import { crearPrismaFalso, empenoDb } from './testing/fake-prisma';

describe('EmpenoPortalService', () => {
  let tenantPrisma: any;
  let mainPrisma: any;
  let svc: EmpenoPortalService;

  const dto = { schemaName: 'tenant_x', identificacion: '123', codigoConsulta: 'ABC234' };

  beforeEach(() => {
    tenantPrisma = crearPrismaFalso();
    mainPrisma   = crearPrismaFalso().client;
    svc = new EmpenoPortalService(mainPrisma, tenantPrisma);
    mainPrisma.tenant.findUnique.mockResolvedValue({ id: 3, schemaName: 'tenant_x' });
    tenantPrisma.client.cliente.findMany.mockResolvedValue([{ id: 10, nombres: 'Ana', apellidos: 'Pérez' }]);
    tenantPrisma.client.empeno.findMany.mockResolvedValue([
      empenoDb({ id: 1, codigoConsulta: 'ABC234' }),
      empenoDb({ id: 2, codigo: 'EMP-000002', codigoConsulta: 'ZZZ999' }),
    ]);
  });

  it('código correcto devuelve todos los empeños del cliente sin datos internos', async () => {
    const r = await svc.consultar(dto, '1.1.1.1');
    expect(r.cliente).toEqual({ nombres: 'Ana', apellidos: 'Pérez' });
    expect(r.empenos).toHaveLength(2);
    expect(JSON.stringify(r)).not.toContain('codigoConsulta');
    expect(r.empenos[0]).not.toHaveProperty('id');
    expect(r.empenos[0]).not.toHaveProperty('notas');
    expect(tenantPrisma.forSchema).toHaveBeenCalledWith('tenant_x');
  });

  it('código que no pertenece a ese cliente → 404', async () => {
    await expect(svc.consultar({ ...dto, codigoConsulta: 'QQQ111' }, '1.1.1.1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('con clientes duplicados por identificación encuentra el del código', async () => {
    tenantPrisma.client.cliente.findMany.mockResolvedValue([
      { id: 10, nombres: 'Ana', apellidos: 'Pérez' },
      { id: 11, nombres: 'Ana María', apellidos: 'Pérez' },
    ]);
    tenantPrisma.client.empeno.findMany.mockImplementation(({ where }) => Promise.resolve(
      where.clienteId === 11 ? [empenoDb({ id: 7, clienteId: 11, codigoConsulta: 'KKK777' })] : [],
    ));
    const r = await svc.consultar({ ...dto, codigoConsulta: 'KKK777' }, '9.9.9.9');
    expect(r.cliente.nombres).toBe('Ana María');
  });

  it('empresa inexistente → 404', async () => {
    mainPrisma.tenant.findUnique.mockResolvedValue(null);
    await expect(svc.consultar(dto, '1.1.1.1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('el esquema principal no es consultable → 404', async () => {
    await expect(svc.consultar({ ...dto, schemaName: 'master' }, '1.1.1.1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('tras 10 fallos desde la misma IP → 429 aunque el 11.º sea correcto', async () => {
    for (let i = 0; i < 10; i++) {
      await expect(svc.consultar({ ...dto, codigoConsulta: 'QQQ111' }, '2.2.2.2')).rejects.toBeInstanceOf(NotFoundException);
    }
    const err = await svc.consultar(dto, '2.2.2.2').catch(e => e);
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(429);
  });

  it('otra IP no se ve afectada', async () => {
    for (let i = 0; i < 10; i++) {
      await svc.consultar({ ...dto, codigoConsulta: 'QQQ111' }, '3.3.3.3').catch(() => undefined);
    }
    await expect(svc.consultar(dto, '4.4.4.4')).resolves.toBeDefined();
  });
});
