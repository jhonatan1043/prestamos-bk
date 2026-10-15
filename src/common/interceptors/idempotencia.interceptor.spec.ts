import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { IdempotenciaInterceptor } from './idempotencia.interceptor';

/** Contexto HTTP falso con petición y respuesta mínimas. */
function contexto(headers: Record<string, string>, method = 'POST', path = '/pagos') {
  const res = { statusCode: 201, status: jest.fn(function (this: any, s: number) { this.statusCode = s; return this; }) };
  const req = { headers, method, path, user: { id: 5, schemaName: 'tenant_x' } };
  return { ctx: { switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }) } as any, res };
}

describe('IdempotenciaInterceptor', () => {
  let tabla: Map<string, any>;
  let prisma: any;
  let interceptor: IdempotenciaInterceptor;

  beforeEach(() => {
    tabla = new Map();
    const delegado = {
      create: jest.fn(async ({ data }) => {
        if (tabla.has(data.clave)) throw Object.assign(new Error('unique'), { code: 'P2002' });
        tabla.set(data.clave, { ...data });
        return data;
      }),
      findUnique: jest.fn(async ({ where }) => tabla.get(where.clave) ?? null),
      update: jest.fn(async ({ where, data }) => { tabla.set(where.clave, { ...tabla.get(where.clave), ...data }); }),
      delete: jest.fn(async ({ where }) => { tabla.delete(where.clave); }),
    };
    prisma = { client: { solicitudIdempotente: delegado } };
    interceptor = new IdempotenciaInterceptor(prisma);
  });

  const ejecutar = (headers: Record<string, string>, handler: () => any, method = 'POST', path = '/pagos') => {
    const { ctx, res } = contexto(headers, method, path);
    return { resultado: lastValueFrom(interceptor.intercept(ctx, { handle: handler })), res };
  };

  it('sin cabecera no hace nada', async () => {
    const { resultado } = ejecutar({}, () => of({ id: 1 }));
    await expect(resultado).resolves.toEqual({ id: 1 });
    expect(prisma.client.solicitudIdempotente.create).not.toHaveBeenCalled();
  });

  it('la primera vez ejecuta y guarda la respuesta', async () => {
    const handler = jest.fn(() => of({ id: 10 }));
    await ejecutar({ 'x-idempotency-key': 'clave-0001' }, handler).resultado;
    expect(handler).toHaveBeenCalledTimes(1);
    expect(tabla.get('clave-0001')).toMatchObject({ estado: 'COMPLETADO', respuesta: { id: 10 }, status: 201 });
  });

  it('un reintento con la misma clave devuelve la respuesta guardada sin volver a ejecutar', async () => {
    await ejecutar({ 'x-idempotency-key': 'clave-0001' }, () => of({ id: 10 })).resultado;
    const handler = jest.fn(() => of({ id: 99 }));
    const { resultado, res } = ejecutar({ 'x-idempotency-key': 'clave-0001' }, handler);
    await expect(resultado).resolves.toEqual({ id: 10 });
    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('la misma clave en otra ruta → 422', async () => {
    await ejecutar({ 'x-idempotency-key': 'clave-0001' }, () => of({ id: 10 })).resultado;
    await expect(ejecutar({ 'x-idempotency-key': 'clave-0001' }, () => of({}), 'POST', '/clientes').resultado)
      .rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('si la primera sigue en proceso → 409', async () => {
    tabla.set('clave-0002', { clave: 'clave-0002', ruta: 'POST /pagos', estado: 'EN_PROCESO' });
    await expect(ejecutar({ 'x-idempotency-key': 'clave-0002' }, () => of({})).resultado)
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('si la operación falla se libera la clave para poder reintentar', async () => {
    await expect(ejecutar({ 'x-idempotency-key': 'clave-0003' }, () => throwError(() => new Error('caído'))).resultado)
      .rejects.toThrow('caído');
    expect(tabla.has('clave-0003')).toBe(false);
  });

  it('GET y claves con formato inválido se ignoran', async () => {
    await ejecutar({ 'x-idempotency-key': 'clave-0004' }, () => of([]), 'GET').resultado;
    await ejecutar({ 'x-idempotency-key': 'x' }, () => of({})).resultado;
    expect(prisma.client.solicitudIdempotente.create).not.toHaveBeenCalled();
  });
});
