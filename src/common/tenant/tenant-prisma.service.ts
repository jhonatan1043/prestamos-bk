import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContextService } from './tenant-context.service';

/**
 * Reemplaza PrismaService en todos los módulos de negocio (clientes, prestamos,
 * pagos, users, etc.). Enruta automáticamente cada consulta al esquema PostgreSQL
 * del tenant activo en el request (leído desde AsyncLocalStorage via TenantContextService).
 *
 * Los repositorios que lo inyecten pueden usar this.prisma.user.findMany() etc.
 * exactamente igual que con PrismaService — sin cambiar la lógica de negocio.
 */
@Injectable()
export class TenantPrismaService implements OnModuleDestroy {
  private readonly clients = new Map<string, PrismaClient>();

  constructor(private readonly ctx: TenantContextService) {}

  /** Devuelve el PrismaClient correspondiente al esquema activo. */
  get client(): PrismaClient {
    const schema = this.ctx.getSchema();
    if (!this.clients.has(schema)) {
      const baseUrl = process.env.DATABASE_URL ?? '';
      const url = baseUrl.replace(/([?&])schema=[^&]*/, `$1schema=${schema}`);
      this.clients.set(schema, new PrismaClient({ datasources: { db: { url } } }));
    }
    return this.clients.get(schema)!;
  }

  // ─── Delegates de modelos (misma API que PrismaClient) ────────────────────
  get user()        { return this.client.user; }
  get cliente()     { return this.client.cliente; }
  get prestamo()    { return this.client.prestamo; }
  get pago()        { return this.client.pago; }
  get estado()      { return this.client.estado; }
  get empresa()     { return this.client.empresa; }
  get ruta()        { return this.client.ruta; }
  get gasto()       { return this.client.gasto; }
  get auditLog()    { return this.client.auditLog; }
  get clienteRuta() { return this.client.clienteRuta; }

  // ─── Métodos raw ──────────────────────────────────────────────────────────
  $executeRaw(query: TemplateStringsArray, ...values: any[]) {
    return this.client.$executeRaw(query, ...values);
  }
  $executeRawUnsafe(query: string, ...values: any[]) {
    return this.client.$executeRawUnsafe(query, ...values);
  }
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: any[]): Promise<T> {
    return this.client.$queryRaw<T>(query, ...values);
  }
  $transaction(fn: (tx: PrismaClient) => Promise<any>, options?: any) {
    return this.client.$transaction(fn as any, options);
  }

  async onModuleDestroy() {
    for (const client of this.clients.values()) {
      await client.$disconnect();
    }
  }
}
