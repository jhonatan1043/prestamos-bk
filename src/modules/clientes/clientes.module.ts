import { Module } from '@nestjs/common';
import { PrismaClienteRepository } from './infrastructure/cliente.repository';
import { ClientesService } from './application/clientes.service';
import { ClientesController } from './presentation/clientes.controller';
import { AuditLogModule } from '../../common/audit/audit-log.module';
import { SuscripcionesModule } from '../suscripciones/suscripciones.module';

@Module({
  imports: [AuditLogModule, SuscripcionesModule],
  controllers: [ClientesController],
  providers: [
    ClientesService,
    {
      provide: 'IClienteRepository',
      useClass: PrismaClienteRepository,
    },
  ],
  exports: [ClientesService],
})
export class ClientesModule {}
