import { Module } from '@nestjs/common';
import { PrismaService }            from '../../common/prisma/prisma.service';
import { TenantService }            from './application/tenant.service';
import { PrismaTenantRepository }   from './infrastructure/prisma-tenant.repository';
import { SchemaProvisionerService } from './infrastructure/schema-provisioner.service';
import { TenantController }         from './presentation/tenant.controller';
import { PaymentsModule }           from '../payments/payments.module';

@Module({
  imports: [PaymentsModule],
  controllers: [TenantController],
  providers: [
    PrismaService,          // esquema principal para suscripciones y planes
    TenantService,
    SchemaProvisionerService,
    { provide: 'ITenantRepository', useClass: PrismaTenantRepository },
  ],
  exports: [TenantService],
})
export class TenantsModule {}
