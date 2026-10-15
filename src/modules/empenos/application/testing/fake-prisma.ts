/** Utilidades de prueba: TenantPrismaService falso y datos de ejemplo de empeños. */
const MODELOS = ['empeno', 'articuloEmpeno', 'pagoEmpeno', 'movimientoEmpeno', 'cliente', 'tenant'] as const;
const METODOS = ['findFirst', 'findUnique', 'findMany', 'create', 'update', 'updateMany', 'delete', 'count'] as const;

export function crearPrismaFalso() {
  const client: any = {};
  for (const m of MODELOS) {
    client[m] = {};
    for (const f of METODOS) client[m][f] = jest.fn().mockResolvedValue(f === 'findMany' ? [] : null);
  }
  client.$transaction = jest.fn((fn: (tx: any) => any) => fn(client));
  client.$queryRaw = jest.fn().mockResolvedValue([]);
  return { client, forSchema: jest.fn(() => client) } as any;
}

export const admin    = { id: 1, role: 'ADMIN', schemaName: 'tenant_x' };
export const cobrador = { id: 2, role: 'USER',  schemaName: 'tenant_x' };

/** Empeño como lo devuelve Prisma: 1.000.000 al 5 % MES, mín 2, máx 4, ingreso 2026-01-01. */
export function empenoDb(over: Record<string, any> = {}) {
  return {
    id: 1, codigo: 'EMP-000001', clienteId: 10, usuarioId: 1, tipoArticulo: 'GENERAL',
    montoPrestado: 1_000_000, tasa: 5, tipoPlazo: 'MES', periodosMinimos: 2, periodosMaximos: 4,
    periodosPagados: 0, fechaIngreso: new Date('2026-01-01'), fechaMinima: new Date('2026-03-01'),
    fechaMaxima: new Date('2099-05-01'), saldoCapital: 1_000_000, estado: 'ACTIVO',
    fechaSalida: null, motivoSalida: null, montoSalida: null, codigoConsulta: 'ABC234', notas: null,
    deletedAt: null, deletedById: null, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
    articulo: { id: 1, empenoId: 1, descripcion: 'Anillo de oro' },
    cliente: { id: 10, nombres: 'Ana', apellidos: 'Pérez', identificacion: '123' },
    usuario: { id: 1, nombre: 'Admin' },
    pagos: [], movimientos: [],
    ...over,
  };
}
