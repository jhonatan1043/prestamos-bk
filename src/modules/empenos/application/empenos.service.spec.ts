import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EmpenosService } from './empenos.service';
import { admin, cobrador, crearPrismaFalso, empenoDb } from './testing/fake-prisma';

describe('EmpenosService', () => {
  let prisma: any;
  let audit: { log: jest.Mock };
  let svc: EmpenosService;

  const dtoGeneral = {
    clienteId: 10, tipoArticulo: 'GENERAL' as const, montoPrestado: 1_000_000, tasa: 5, tipoPlazo: 'MES' as const,
    periodosMinimos: 2, periodosMaximos: 4, fechaIngreso: '2026-01-01T00:00:00.000Z',
    articulo: { descripcion: 'Anillo de oro' },
  };
  const dtoVehiculo = { ...dtoGeneral, tipoArticulo: 'VEHICULO' as const };

  beforeEach(() => {
    prisma = crearPrismaFalso();
    audit  = { log: jest.fn() };
    svc    = new EmpenosService(prisma, audit as any);
    prisma.client.cliente.findFirst.mockResolvedValue({ id: 10 });
    prisma.client.empeno.create.mockImplementation(({ data }) => Promise.resolve(empenoDb({ ...data, id: 1 })));
    prisma.client.empeno.findFirst.mockResolvedValue(empenoDb());
  });

  describe('visibilidad', () => {
    it('cobrador solo lista los suyos', async () => {
      await svc.listar({}, cobrador);
      const where = prisma.client.empeno.findMany.mock.calls[0][0].where;
      expect(where).toMatchObject({ usuarioId: cobrador.id, deletedAt: null });
    });

    it('admin lista todos', async () => {
      await svc.listar({}, admin);
      expect(prisma.client.empeno.findMany.mock.calls[0][0].where.usuarioId).toBeUndefined();
    });

    it('cobrador no puede pedir eliminados', async () => {
      await svc.listar({ incluirEliminados: 'true' }, cobrador);
      expect(prisma.client.empeno.findMany.mock.calls[0][0].where.deletedAt).toBeNull();
    });

    it('admin con incluirEliminados ve también los eliminados', async () => {
      await svc.listar({ incluirEliminados: 'true' }, admin);
      expect(prisma.client.empeno.findMany.mock.calls[0][0].where).not.toHaveProperty('deletedAt');
    });

    it('cobrador no ve empeño ajeno → 404', async () => {
      prisma.client.empeno.findFirst.mockResolvedValue(null);
      await expect(svc.obtener(7, cobrador)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.client.empeno.findFirst.mock.calls[0][0].where).toMatchObject({ id: 7, usuarioId: cobrador.id });
    });

    it('filtro VENCIDO usa la fecha máxima', async () => {
      await svc.listar({ estado: 'VENCIDO' }, admin);
      const where = prisma.client.empeno.findMany.mock.calls[0][0].where;
      expect(where.estado).toEqual({ in: ['ACTIVO', 'VENCIDO'] });
      expect(where.fechaMaxima.lt).toBeInstanceOf(Date);
    });
  });

  describe('crear', () => {
    it('vehículo sin placa → 400', async () => {
      await expect(svc.crear({ ...dtoVehiculo, articulo: { descripcion: 'Mazda' } }, admin)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('periodosMaximos < periodosMinimos → 400', async () => {
      await expect(svc.crear({ ...dtoGeneral, periodosMinimos: 3, periodosMaximos: 2 }, admin)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('cliente inexistente → 404', async () => {
      prisma.client.cliente.findFirst.mockResolvedValue(null);
      await expect(svc.crear(dtoGeneral, admin)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('fecha de ingreso futura → 400', async () => {
      await expect(svc.crear({ ...dtoGeneral, fechaIngreso: '2999-01-01T00:00:00.000Z' }, admin)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('calcula fechas, toma el usuario del actor y registra ENTRADA', async () => {
      prisma.client.empeno.findFirst.mockResolvedValueOnce(null); // no hay empeños previos
      await svc.crear(dtoGeneral, cobrador);
      const data = prisma.client.empeno.create.mock.calls[0][0].data;
      expect(data.fechaMinima.toISOString().slice(0, 10)).toBe('2026-03-01');
      expect(data.fechaMaxima.toISOString().slice(0, 10)).toBe('2026-05-01');
      expect(data.usuarioId).toBe(cobrador.id);
      expect(data.codigo).toBe('EMP-000001');
      expect(data.saldoCapital).toBe(1_000_000);
      expect(prisma.client.movimientoEmpeno.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tipo: 'ENTRADA', usuarioId: cobrador.id }) }),
      );
      expect(audit.log).toHaveBeenCalledWith(cobrador.id, 'EMPENO_CREAR', 'Empeno', 1, expect.any(String));
    });
  });

  describe('editar y eliminar', () => {
    const conPago = () => empenoDb({
      pagos: [{ id: 1, tipo: 'INTERES', monto: 50_000, fecha: new Date('2026-01-15'), periodosCubiertos: 1 }],
    });

    it('no cambia condiciones si hay pagos → 409', async () => {
      prisma.client.empeno.findFirst.mockResolvedValue(conPago());
      await expect(svc.actualizar(1, { tasa: 6 }, admin)).rejects.toBeInstanceOf(ConflictException);
    });

    it('sí permite cambiar notas con pagos', async () => {
      prisma.client.empeno.findFirst.mockResolvedValue(conPago());
      await svc.actualizar(1, { notas: 'Revisado' }, admin);
      expect(prisma.client.empeno.update).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(admin.id, 'EMPENO_ACTUALIZAR', 'Empeno', 1, expect.any(String));
    });

    it('no edita un empeño con salida → 409', async () => {
      prisma.client.empeno.findFirst.mockResolvedValue(empenoDb({ estado: 'RECUPERADO' }));
      await expect(svc.actualizar(1, { notas: 'x' }, admin)).rejects.toBeInstanceOf(ConflictException);
    });

    it('eliminar hace soft delete y audita', async () => {
      await svc.eliminar(1, admin);
      expect(prisma.client.empeno.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ deletedById: admin.id, deletedAt: expect.any(Date) }),
      }));
      expect(prisma.client.empeno.delete).not.toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(admin.id, 'EMPENO_ELIMINAR', 'Empeno', 1, expect.any(String));
    });
  });
});
