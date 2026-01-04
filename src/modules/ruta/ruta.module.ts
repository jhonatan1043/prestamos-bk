import { Module } from '@nestjs/common';
import { RutaController } from './presentation/ruta.controller';
import { RutaService } from './application/ruta.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { PrismaRutaRepository } from './infrastructure/prisma-ruta-repository';
import { IRutaRepository } from './domain/repositories/ruta.repository';

@Module({
  controllers: [RutaController],
  providers: [
    RutaService,
    PrismaService,
    {
      provide: 'IRutaRepository',
      useClass: PrismaRutaRepository,
    },
  ],
})
export class RutaModule {}
