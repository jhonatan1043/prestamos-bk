import { Module } from '@nestjs/common';
import { VentasService } from './application/ventas.service';
import { VentasController } from './presentation/ventas.controller';

@Module({
  controllers: [VentasController],
  providers:   [VentasService],
  exports:     [VentasService],
})
export class VentasModule {}
