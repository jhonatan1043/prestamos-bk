import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PrismaClienteRepository } from './infrastructure/cliente.repository';
import { ClientesService } from './application/clientes.service';
import { ClientesController } from './presentation/clientes.controller';

@Module({
  controllers: [ClientesController], 
  providers: [
    PrismaService,
    ClientesService,
    {
      provide: 'IClienteRepository', // Token para inyección
      useClass: PrismaClienteRepository,
    },
  ],
  exports: [ClientesService],
})
export class ClientesModule {}
