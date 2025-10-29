import { Module } from '@nestjs/common';
import { CobradorController } from './presentation/cobrador.controller';
import { CobradorService } from './application/cobrador.service';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Module({
  controllers: [CobradorController],
  providers: [CobradorService, PrismaService],
})
export class CobradorModule {}
