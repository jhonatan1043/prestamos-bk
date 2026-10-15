import { Module } from '@nestjs/common';
import { PrestamosService } from './application/prestamos.service';
import { PrismaPrestamoRepository } from './infrastructure/prisma-prestamo-repository';
import { PrestamosController } from './presentation/prestamos.controller';
import { PrestamosPortalController } from './presentation/prestamos-portal.controller';
import { PrestamoPortalService } from './application/prestamo-portal.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EstadosModule } from '../estados/estados.module';
import { AuditLogModule } from '../../common/audit/audit-log.module';
import { SuscripcionesModule } from '../suscripciones/suscripciones.module';

@Module({
  imports: [EstadosModule, AuditLogModule, SuscripcionesModule, PrismaModule],
  controllers: [PrestamosPortalController, PrestamosController],
  providers: [
    PrestamosService,
    PrestamoPortalService,
    {
      provide: 'IPrestamoRepository',
      useClass: PrismaPrestamoRepository,
    },
  ],
  exports: [PrestamosService],
})
export class PrestamosModule {}
