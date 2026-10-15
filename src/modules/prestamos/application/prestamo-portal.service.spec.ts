import { HttpException, NotFoundException } from '@nestjs/common';
import { PrestamoPortalService } from './prestamo-portal.service';

function crearPrismaFalso() {
  const client: any = {
    tenant:   { findUnique: jest.fn().mockResolvedValue(null) },
    cliente:  { findFirst:  jest.fn().mockResolvedValue(null) },
    prestamo: { findMany:   jest.fn().mockResolvedValue([]) },
  };
  return { client, forSchema: jest.fn(() => client) } as any;
}

const activo  = { id: 1, nombre: 'ACTIVO' };
const borrado = { id: 2, nombre: 'BORRADO' };

function prestamoDb(over: Record<string, any> = {}) {
  return {
    id: 7, codigo: 'PRE-000007', monto: 1_000_000, tasa: 20, plazoDias: 30, tipoPlazo: 'DIA',
    fechaInicio: new Date('2026-09-01'), estadoId: 1, clienteId: 10, usuarioId: 1,
    tipoPrestamo: 'FIJO', totalConIntereses: 1_200_000, estado: activo,
    createdAt: new Date('2026-09-01'), updatedAt: new Date('2026-09-01'),
    pagos: [
      { id: 50, prestamoId: 7, fecha: new Date('2026-09-02'), monto: 40_000, estadoId: 1, estado: activo },
      { id: 51, prestamoId: 7, fecha: new Date('2026-09-03'), monto: 99_000, estadoId: 2, estado: borrado },
    ],
    ...over,
  };
}

describe('PrestamoPortalService', () => {
  let tenantPrisma: any;
  let mainPrisma: any;
  let svc: PrestamoPortalService;

  const dto = { schemaName: 'tenant_x', identificacion: '123', ultimosTelefono: '4567' };

  beforeEach(() => {
    tenantPrisma = crearPrismaFalso();
    mainPrisma   = crearPrismaFalso().client;
    svc = new PrestamoPortalService(mainPrisma, tenantPrisma);
    mainPrisma.tenant.findUnique.mockResolvedValue({ id: 3 });
    tenantPrisma.client.cliente.findFirst.mockResolvedValue({ id: 10, nombres: 'Ana', apellidos: 'Pérez', telefono: '+57 300 123 4567' });
    tenantPrisma.client.prestamo.findMany.mockResolvedValue([prestamoDb()]);
  });

  it('datos correctos devuelven los préstamos del cliente sin datos internos', async () => {
    const r = await svc.consultar(dto, '1.1.1.1');
    expect(r.cliente).toEqual({ nombres: 'Ana', apellidos: 'Pérez' });
    expect(r.prestamos).toHaveLength(1);
    expect(r.prestamos[0]).toMatchObject({
      codigo: 'PRE-000007', estado: 'ACTIVO', monto: 1_000_000,
      totalConIntereses: 1_200_000, totalPagado: 40_000, saldoPendiente: 1_160_000,
    });
    expect(r.prestamos[0].pagos).toEqual([{ fecha: new Date('2026-09-02'), monto: 40_000 }]);
    const json = JSON.stringify(r);
    for (const interno of ['"id"', 'clienteId', 'usuarioId', 'estadoId', 'prestamoId', 'telefono']) {
      expect(json).not.toContain(interno);
    }
    expect(tenantPrisma.forSchema).toHaveBeenCalledWith('tenant_x');
    expect(tenantPrisma.client.prestamo.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { clienteId: 10, estado: { nombre: { not: 'BORRADO' } } },
    }));
  });

  it('teléfono que no coincide → 404 genérico', async () => {
    const err = await svc.consultar({ ...dto, ultimosTelefono: '0000' }, '1.1.1.1').catch(e => e);
    expect(err).toBeInstanceOf(NotFoundException);
    expect(err.message).toBe('No se encontró información con esos datos');
  });

  it('cliente inexistente o inactivo → mismo 404 genérico', async () => {
    tenantPrisma.client.cliente.findFirst.mockResolvedValue(null);
    const err = await svc.consultar(dto, '1.1.1.1').catch(e => e);
    expect(err).toBeInstanceOf(NotFoundException);
    expect(err.message).toBe('No se encontró información con esos datos');
  });

  it('cliente con teléfono de menos de 4 dígitos → 404', async () => {
    tenantPrisma.client.cliente.findFirst.mockResolvedValue({ id: 10, nombres: 'Ana', apellidos: 'Pérez', telefono: '' });
    await expect(svc.consultar(dto, '1.1.1.1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('empresa inexistente → 404 sin consultar el esquema', async () => {
    mainPrisma.tenant.findUnique.mockResolvedValue(null);
    await expect(svc.consultar(dto, '1.1.1.1')).rejects.toBeInstanceOf(NotFoundException);
    expect(tenantPrisma.forSchema).not.toHaveBeenCalled();
  });

  it('el esquema principal no es consultable → 404', async () => {
    await expect(svc.consultar({ ...dto, schemaName: 'master' }, '1.1.1.1')).rejects.toBeInstanceOf(NotFoundException);
    expect(tenantPrisma.forSchema).not.toHaveBeenCalled();
  });

  it('tras 10 fallos desde la misma IP → 429 aunque el 11.º sea correcto', async () => {
    for (let i = 0; i < 10; i++) {
      await expect(svc.consultar({ ...dto, ultimosTelefono: '0000' }, '2.2.2.2')).rejects.toBeInstanceOf(NotFoundException);
    }
    const err = await svc.consultar(dto, '2.2.2.2').catch(e => e);
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(429);
  });

  it('otra IP no se ve afectada', async () => {
    for (let i = 0; i < 10; i++) {
      await svc.consultar({ ...dto, ultimosTelefono: '0000' }, '3.3.3.3').catch(() => undefined);
    }
    await expect(svc.consultar(dto, '4.4.4.4')).resolves.toBeDefined();
  });
});
