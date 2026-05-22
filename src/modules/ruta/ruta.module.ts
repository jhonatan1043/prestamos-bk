import { Module } from '@nestjs/common';
import { RutaController } from './presentation/ruta.controller';
import { RutaService } from './application/ruta.service';
import { PrismaRutaRepository } from './infrastructure/prisma-ruta-repository';
import { IRutaRepository } from './domain/repositories/ruta.repository';

@Module({
  controllers: [RutaController],
  providers: [
    RutaService,
    {
      provide: 'IRutaRepository',
      useClass: PrismaRutaRepository,
    },
  ],
})
export class RutaModule {}
