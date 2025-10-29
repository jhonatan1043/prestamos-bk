import { UpdateEstadoPrestamoDto } from '../application/dto/update-estado-prestamo.dto';
import { Controller, Post, Get, Put, Delete, Param, Body, UseGuards, Req, Patch } from '@nestjs/common';
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
// @UseGuards(JwtAuthGuard) // 🔒 Solo en métodos específicos
export class PrestamosController {
  @Get('cliente/:identificacion')
  @ApiOperation({ summary: 'Listar préstamos por identificación de cliente' })
  @ApiParam({ name: 'identificacion', type: String, description: 'Identificación del cliente' })
  @ApiResponse({ status: 200, description: 'Listado de préstamos', type: [Prestamo] })
  findByClienteIdentificacion(@Param('identificacion') identificacion: string) {
    return this.prestamosService.findByClienteIdentificacion(identificacion);
  }

  constructor(private readonly prestamosService: PrestamosService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Crear préstamo' })
  @ApiResponse({ status: 201, type: Prestamo })
  @ApiBody({ type: CreatePrestamoDto })
  create(@Body() data: CreatePrestamoDto) {
    // El DTO ya valida los datos
    return this.prestamosService.create({ ...data});
  }


  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Listar préstamos' })
  @ApiResponse({ status: 200, description: 'Listado de préstamos', type: [Prestamo] })
  findAll() {
    return this.prestamosService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Obtener préstamo por ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del préstamo' })
  @ApiResponse({ status: 200, description: 'Préstamo encontrado', type: Prestamo })
  @ApiResponse({ status: 404, description: 'Préstamo no encontrado' })
  findById(@Param('id') id: string) {
    return this.prestamosService.findById(+id);
  }


  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar préstamo' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del préstamo' })
  @ApiResponse({ status: 200, description: 'Préstamo actualizado', type: Prestamo })
  @ApiResponse({ status: 404, description: 'Préstamo no encontrado' })
  @ApiBody({ type: UpdatePrestamoDto })
  update(@Param('id') id: string, @Body() data: UpdatePrestamoDto) {
    return this.prestamosService.update(+id, data);
  }


  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar préstamo' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del préstamo' })
  @ApiResponse({ status: 204, description: 'Préstamo eliminado' })
  @ApiResponse({ status: 404, description: 'Préstamo no encontrado' })
  delete(@Param('id') id: string) {
    return this.prestamosService.delete(+id);
  }


  @UseGuards(JwtAuthGuard)
  @Patch(':id/estado')
  @ApiOperation({ summary: 'Actualizar estado del préstamo' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del préstamo' })
  @ApiBody({ type: UpdateEstadoPrestamoDto })
  @ApiResponse({ status: 200, description: 'Estado actualizado', type: Prestamo })
  async actualizarEstado(
    @Param('id') id: string,
    @Body() dto: UpdateEstadoPrestamoDto
  ) {
    return this.prestamosService.actualizarEstado(+id, dto);
  }
}
