import { Module } from '@nestjs/common';
import { EstadosModule } from '../estados/estados.module';
import { PagosService } from './application/pagos.service';
import { PagosController } from './presentation/pagos.controller';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PrismaPagoRepository } from './infrastructure/prisma-pago.repository';

@Module({
  imports: [EstadosModule],
  controllers: [PagosController],
  providers: [
    PagosService,
    PrismaService,
    {
      provide: 'IPagoRepository',
      useClass: PrismaPagoRepository,
    },
  ],
  exports: [PagosService],
})
export class PagosModule {}
