import { Module } from '@nestjs/common';
import { EstadosModule } from '../estados/estados.module';
import { PagosService } from './application/pagos.service';
import { PagosController } from './presentation/pagos.controller';
import { PrismaPagoRepository } from './infrastructure/prisma-pago.repository';
import { AuditLogModule } from '../../common/audit/audit-log.module';

@Module({
  imports: [EstadosModule, AuditLogModule],
  controllers: [PagosController],
  providers: [
    PagosService,
    {
      provide: 'IPagoRepository',
      useClass: PrismaPagoRepository,
    },
  ],
  exports: [PagosService],
})
export class PagosModule {}
