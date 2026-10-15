import { Module } from '@nestjs/common';
import { AuditLogModule } from '../../common/audit/audit-log.module';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AdminWebGuard } from '../../common/auth/admin-web.guard';
import { EmpenosService } from './application/empenos.service';
import { EmpenoPagosService } from './application/empeno-pagos.service';
import { EmpenoReportesService } from './application/empeno-reportes.service';
import { EmpenoPortalService } from './application/empeno-portal.service';
import { EmpenosController } from './presentation/empenos.controller';
import { EmpenosPortalController } from './presentation/empenos-portal.controller';

@Module({
  imports:     [AuditLogModule, PrismaModule],
  controllers: [EmpenosPortalController, EmpenosController],
  providers:   [EmpenosService, EmpenoPagosService, EmpenoReportesService, EmpenoPortalService, AdminWebGuard],
})
export class EmpenosModule {}
