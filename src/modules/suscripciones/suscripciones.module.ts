import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaymentsModule } from '../payments/payments.module';
import { PlanService } from './application/plan.service';
import { SuscripcionService } from './application/suscripcion.service';
import { LimitesService } from './application/limites.service';
import { PrismaPlanRepository } from './infrastructure/prisma-plan.repository';
import { PrismaSuscripcionRepository } from './infrastructure/prisma-suscripcion.repository';
import { PlanController } from './presentation/plan.controller';
import { SuscripcionController } from './presentation/suscripcion.controller';

@Module({
  imports: [PaymentsModule],
  controllers: [PlanController, SuscripcionController],
  providers: [
    PrismaService,                        // esquema principal → planes y suscripciones de facturación
    PlanService,
    SuscripcionService,
    LimitesService,                       // usa TenantPrismaService (global) → esquema del tenant
    { provide: 'IPlanRepository',         useClass: PrismaPlanRepository },
    { provide: 'ISuscripcionRepository',  useClass: PrismaSuscripcionRepository },
  ],
  exports: [LimitesService],
})
export class SuscripcionesModule {}
