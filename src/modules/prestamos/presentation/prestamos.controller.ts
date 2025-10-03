import { Controller, Post, Get, Put, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { UpdatePrestamoDto } from '../application/dto/update-prestamo.dto';
import { CreatePrestamoDto } from '../application/dto/create-prestamo.dto';
import { PrestamosService } from '../application/prestamos.service';
import { Prestamo } from '../domain/entities/prestamo.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/jwt-auth.guard';

@ApiTags('prestamos')
@Controller('prestamos')
@ApiBearerAuth() // 🔑 Swagger muestra el candado y permite poner el token
@UseGuards(JwtAuthGuard) // 🔒 protege todas las rutas del controlador
export class PrestamosController {
  constructor(private readonly prestamosService: PrestamosService) {}
  @Post()
  @ApiOperation({ summary: 'Crear préstamo' })
  @ApiResponse({ status: 201, type: Prestamo })
  @ApiBody({ type: CreatePrestamoDto })
  create(@Body() data: CreatePrestamoDto) {
    // El DTO ya valida los datos
    return this.prestamosService.create({ ...data});
  }

  @Get()
  @ApiOperation({ summary: 'Listar préstamos' })
  @ApiResponse({ status: 200, description: 'Listado de préstamos', type: [Prestamo] })
  findAll() {
    return this.prestamosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener préstamo por ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del préstamo' })
  @ApiResponse({ status: 200, description: 'Préstamo encontrado', type: Prestamo })
  @ApiResponse({ status: 404, description: 'Préstamo no encontrado' })
  findById(@Param('id') id: string) {
    return this.prestamosService.findById(+id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar préstamo' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del préstamo' })
  @ApiResponse({ status: 200, description: 'Préstamo actualizado', type: Prestamo })
  @ApiResponse({ status: 404, description: 'Préstamo no encontrado' })
  @ApiBody({ type: UpdatePrestamoDto })
  update(@Param('id') id: string, @Body() data: UpdatePrestamoDto) {
    return this.prestamosService.update(+id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar préstamo' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del préstamo' })
  @ApiResponse({ status: 204, description: 'Préstamo eliminado' })
  @ApiResponse({ status: 404, description: 'Préstamo no encontrado' })
  delete(@Param('id') id: string) {
    return this.prestamosService.delete(+id);
  }
}
