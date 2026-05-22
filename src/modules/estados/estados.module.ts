import { Module } from '@nestjs/common';
import { EstadosService } from './application/estados.service';
import { PrismaEstadoRepository } from './infrastructure/prisma-estado.repository';
import { EstadosController } from './presentation/estados.controller';

@Module({
  controllers: [EstadosController],
  providers: [
    EstadosService,
    { provide: 'IEstadoRepository', useClass: PrismaEstadoRepository },
  ],
  exports: [EstadosService, { provide: 'IEstadoRepository', useClass: PrismaEstadoRepository }],
})
export class EstadosModule {}
