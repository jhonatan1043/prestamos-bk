import { Module } from '@nestjs/common';
import { PrestamosService } from './application/prestamos.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PrismaPrestamoRepository } from './infrastructure/prisma-prestamo.repository';
import { PrestamosController } from './presentation/prestamos.controller';

@Module({
  controllers: [PrestamosController],
  providers: [
    PrestamosService,
    PrismaService,
    {
      provide: 'IPrestamoRepository',
      useClass: PrismaPrestamoRepository,
    },
  ],
  exports: [PrestamosService],
})
export class PrestamosModule {}
