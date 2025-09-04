import { Controller, Post, Get, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { PrestamosService } from '../application/prestamos.service';
import { Prestamo } from '../domain/entities/prestamo.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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
  create(@Body() data: Omit<Prestamo, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.prestamosService.create(data);
  }

  @Get()
  @ApiOperation({ summary: 'Listar préstamos' })
  @ApiResponse({ status: 200, type: [Prestamo] })
  findAll() {
    return this.prestamosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener préstamo por ID' })
  @ApiResponse({ status: 200, type: Prestamo })
  findById(@Param('id') id: string) {
    return this.prestamosService.findById(+id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar préstamo' })
  @ApiResponse({ status: 200, type: Prestamo })
  update(@Param('id') id: string, @Body() data: Partial<Prestamo>) {
    return this.prestamosService.update(+id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar préstamo' })
  @ApiResponse({ status: 204 })
  delete(@Param('id') id: string) {
    return this.prestamosService.delete(+id);
  }
}
