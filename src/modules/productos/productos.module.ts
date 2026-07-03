import { Module } from '@nestjs/common';
import { ProductosService } from './application/productos.service';
import { ProductosController } from './presentation/productos.controller';

@Module({
  controllers: [ProductosController],
  providers:   [ProductosService],
  exports:     [ProductosService],
})
export class ProductosModule {}
