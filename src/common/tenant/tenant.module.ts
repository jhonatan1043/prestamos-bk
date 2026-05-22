import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantPrismaService } from './tenant-prisma.service';

/**
 * Módulo global — TenantContextService y TenantPrismaService disponibles
 * en toda la aplicación sin importar este módulo explícitamente.
 */
@Global()
@Module({
  providers: [TenantContextService, TenantPrismaService],
  exports:   [TenantContextService, TenantPrismaService],
})
export class TenantModule {}
