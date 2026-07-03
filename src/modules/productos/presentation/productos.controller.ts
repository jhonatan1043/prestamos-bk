import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { ProductosService } from '../application/productos.service';
import { CreateProductoDto, CreateCategoriaDto } from '../application/dto/create-producto.dto';

@ApiTags('productos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('productos')
export class ProductosController {
  constructor(private readonly service: ProductosService) {}

  // ── Categorías ────────────────────────────────────────────────────────────

  @Post('categorias')
  @ApiOperation({ summary: 'Crear categoría de producto' })
  createCategoria(@Body() dto: CreateCategoriaDto) {
    return this.service.createCategoria(dto);
  }

  @Get('categorias')
  @ApiOperation({ summary: 'Listar categorías' })
  findAllCategorias() {
    return this.service.findAllCategorias();
  }

  @Delete('categorias/:id')
  @ApiOperation({ summary: 'Desactivar categoría' })
  removeCategoria(@Param('id') id: string) {
    return this.service.removeCategoria(+id);
  }

  // ── Productos ─────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Crear producto' })
  create(@Body() dto: CreateProductoDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar productos activos' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener producto por ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar producto' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateProductoDto>) {
    return this.service.update(+id, dto);
  }

  @Put(':id/stock')
  @ApiOperation({ summary: 'Ajustar stock manualmente' })
  @ApiQuery({ name: 'tipo', enum: ['ENTRADA', 'SALIDA'] })
  @ApiQuery({ name: 'cantidad', type: Number })
  ajustarStock(
    @Param('id') id: string,
    @Query('tipo') tipo: 'ENTRADA' | 'SALIDA',
    @Query('cantidad') cantidad: string,
  ) {
    return this.service.ajustarStock(+id, +cantidad, tipo);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar producto' })
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
