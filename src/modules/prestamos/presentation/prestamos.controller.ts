import { Controller, Post, Get, Put, Delete, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/jwt-auth.guard';
import { PrestamosService } from '../application/prestamos.service';
import { CreatePrestamoDto } from '../application/dto/create-prestamo.dto';
import { UpdatePrestamoDto } from '../application/dto/update-prestamo.dto';
import { UpdateEstadoPrestamoDto } from '../application/dto/update-estado-prestamo.dto';
import { Prestamo } from '../domain/entities/prestamo.entity';

@ApiTags('prestamos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('prestamos')
export class PrestamosController {
  constructor(private readonly prestamosService: PrestamosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear préstamo' })
  @ApiBody({ type: CreatePrestamoDto })
  @ApiResponse({ status: 201, type: Prestamo })
  create(@Req() req, @Body() data: CreatePrestamoDto) {
    return this.prestamosService.create(data, req.user?.id ?? 0);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los préstamos' })
  @ApiResponse({ status: 200, type: [Prestamo] })
  findAll() {
    return this.prestamosService.findAll();
  }

  @Get('pendientes')
  @ApiOperation({ summary: 'Préstamos pendientes — todos si admin, propios si cobrador' })
  @ApiResponse({ status: 200, type: [Prestamo] })
  getPendientes(@Req() req) {
    const user  = req.user;
    const roles: string[] = Array.isArray(user.roles)
      ? user.roles.map((r: any) => r.toString().toLowerCase())
      : [user.roles?.toString().toLowerCase() ?? user.role?.toString().toLowerCase() ?? ''];
    const isAdmin = roles.includes('admin');
    return this.prestamosService.findPendientes(user.id, isAdmin);
  }

  @Get('cobrador/:cobradorId')
  @ApiOperation({ summary: 'Listar préstamos por cobrador' })
  @ApiParam({ name: 'cobradorId', type: Number })
  @ApiResponse({ status: 200, type: [Prestamo] })
  findByCobrador(@Param('cobradorId') cobradorId: string) {
    return this.prestamosService.findByCobrador(Number(cobradorId));
  }

  @Get('cliente/:identificacion')
  @ApiOperation({ summary: 'Listar préstamos por identificación de cliente' })
  @ApiParam({ name: 'identificacion', type: String })
  @ApiResponse({ status: 200, type: [Prestamo] })
  findByClienteIdentificacion(@Param('identificacion') identificacion: string) {
    return this.prestamosService.findByClienteIdentificacion(identificacion);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener préstamo por ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: Prestamo })
  @ApiResponse({ status: 404, description: 'Préstamo no encontrado' })
  findById(@Param('id') id: string) {
    return this.prestamosService.findById(+id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar préstamo' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdatePrestamoDto })
  @ApiResponse({ status: 200, type: Prestamo })
  @ApiResponse({ status: 404, description: 'Préstamo no encontrado' })
  update(@Req() req, @Param('id') id: string, @Body() data: UpdatePrestamoDto) {
    return this.prestamosService.update(+id, data, req.user?.id ?? 0);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Actualizar estado del préstamo' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateEstadoPrestamoDto })
  @ApiResponse({ status: 200, type: Prestamo })
  @ApiResponse({ status: 404, description: 'Préstamo o estado no encontrado' })
  actualizarEstado(@Req() req, @Param('id') id: string, @Body() dto: UpdateEstadoPrestamoDto) {
    return this.prestamosService.actualizarEstado(+id, dto, req.user?.id ?? 0);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar préstamo' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Préstamo eliminado' })
  @ApiResponse({ status: 404, description: 'Préstamo no encontrado' })
  delete(@Req() req, @Param('id') id: string) {
    return this.prestamosService.delete(+id, req.user?.id ?? 0);
  }
}
