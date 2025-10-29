import { Module } from '@nestjs/common';
import { RutaController } from './presentation/ruta.controller';
import { RutaService } from './application/ruta.service';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Module({
  controllers: [RutaController],
  providers: [RutaService, PrismaService],
})
export class RutaModule {}
