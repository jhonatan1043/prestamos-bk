import { Controller, Get, Post, Body, Param, Patch, Delete, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GastosService } from '../application/gasto.service';
import { CreateGastoDto } from '../application/dto/create-gasto.dto';
import { UpdateGastoDto } from '../application/dto/update-gasto.dto';

@ApiTags('Gastos')
@Controller('gastos')
export class GastosController {
  constructor(private readonly gastosService: GastosService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los gastos' })
  @ApiResponse({ status: 200, description: 'Lista de gastos obtenida correctamente.' })
  async findAll() {
    return this.gastosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un gasto por ID' })
  @ApiResponse({ status: 200, description: 'Gasto encontrado.' })
  @ApiResponse({ status: 404, description: 'Gasto no encontrado.' })
  async findById(@Param('id') id: string) {
    const gasto = await this.gastosService.findById(Number(id));
    if (!gasto) throw new NotFoundException('Gasto no encontrado');
    return gasto;
  }

  @Post()
  @ApiOperation({ summary: 'Crear un gasto' })
  @ApiResponse({ status: 201, description: 'Gasto creado correctamente.' })
  async create(@Body() createGastoDto: CreateGastoDto) {
    return this.gastosService.create(createGastoDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un gasto' })
  @ApiResponse({ status: 200, description: 'Gasto actualizado correctamente.' })
  @ApiResponse({ status: 404, description: 'Gasto no encontrado.' })
  async update(@Param('id') id: string, @Body() updateGastoDto: UpdateGastoDto) {
    return this.gastosService.update(Number(id), updateGastoDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un gasto' })
  @ApiResponse({ status: 200, description: 'Gasto eliminado correctamente.' })
  @ApiResponse({ status: 404, description: 'Gasto no encontrado.' })
  async remove(@Param('id') id: string) {
    return this.gastosService.remove(Number(id));
  }
}
