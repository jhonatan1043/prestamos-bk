import { Module } from '@nestjs/common';
import { GastosController } from './presentation/gastos.controller';
import { GastosService } from './application/gasto.service';
import { PrismaGastoRepository } from './infrastructure/prisma-gasto-repository';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Module({
  controllers: [GastosController],
  providers: [
    GastosService,
    PrismaService,
    {
      provide: 'IGastoRepository',
      useClass: PrismaGastoRepository,
    },
  ],
  exports: [GastosService],
})
export class GastosModule {}
