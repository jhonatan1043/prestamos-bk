import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { EmpresaService } from './application/empresa.service';
import { EmpresaController } from './presentation/empresa.controller';
import { PrismaEmpresaRepository } from './infrastructure/empresa.repository';

@Module({
  imports: [PrismaModule],
  controllers: [EmpresaController],
  providers: [
    EmpresaService,
    { provide: 'IEmpresaRepository', useClass: PrismaEmpresaRepository },
  ],
})
export class EmpresaModule {}
