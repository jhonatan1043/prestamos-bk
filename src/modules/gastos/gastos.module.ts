import { Module } from '@nestjs/common';
import { GastosController } from './presentation/gastos.controller';
import { GastosService } from './application/gasto.service';
import { PrismaGastoRepository } from './infrastructure/prisma-gasto-repository';

@Module({
  controllers: [GastosController],
  providers: [
    GastosService,
    {
      provide: 'IGastoRepository',
      useClass: PrismaGastoRepository,
    },
  ],
  exports: [GastosService],
})
export class GastosModule {}
