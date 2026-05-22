import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  schemaName: string;
  tenantId:   number;
}

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantContext>();

  run<T>(ctx: TenantContext, fn: () => T): T {
    return this.storage.run(ctx, fn);
  }

  getSchema(): string {
    return this.storage.getStore()?.schemaName ?? (process.env.MAIN_SCHEMA ?? 'tst');
  }

  getTenantId(): number | null {
    return this.storage.getStore()?.tenantId ?? null;
  }

  getContext(): TenantContext | null {
    return this.storage.getStore() ?? null;
  }
}
