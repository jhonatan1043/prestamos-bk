import { Module } from '@nestjs/common';
import { ProveedoresService } from './application/proveedores.service';
import { ProveedoresController } from './presentation/proveedores.controller';

@Module({
  controllers: [ProveedoresController],
  providers:   [ProveedoresService],
  exports:     [ProveedoresService],
})
export class ProveedoresModule {}
