import {
  Controller, Get, Post, Put, Delete, Patch,
  Param, Body, ParseIntPipe, UseGuards, Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/jwt-auth.guard';
import { PagosService } from '../application/pagos.service';
import { CreatePagoDto } from '../application/dto/create-pago.dto';
import { UpdatePagoDto } from '../application/dto/update-pago.dto';
import { UpdateEstadoPagoDto } from '../application/dto/update-estado-pago.dto';
import { PrestamoMoraResumidoDto } from './dto/prestamo-mora-resumido.dto';
import { PagoProyectadoDto } from './dto/pago-proyectado.dto';

@ApiTags('pagos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar un pago' })
  @ApiResponse({ status: 201, description: 'Pago creado exitosamente' })
  create(@Req() req, @Body() dto: CreatePagoDto) {
    return this.pagosService.create(dto, req.user?.id ?? 0);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los pagos' })
  findAll() {
    return this.pagosService.findAll();
  }

  @Get('mora')
  @ApiOperation({ summary: 'Préstamos en mora' })
  @ApiResponse({ status: 200, type: [PrestamoMoraResumidoDto] })
  findPrestamosEnMora() {
    return this.pagosService.prestamosEnMora();
  }

  @Get('historial-cancelados')
  @ApiOperation({ summary: 'Historial de pagos de préstamos cancelados' })
  historialPagosCancelados() {
    return this.pagosService.historialPagosCancelados();
  }

  @Get('saldo/:prestamoId')
  @ApiOperation({ summary: 'Saldo pendiente de un préstamo' })
  saldoPendientePrestamo(@Param('prestamoId', ParseIntPipe) prestamoId: number) {
    return this.pagosService.saldoPendientePrestamo(prestamoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un pago por ID' })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.pagosService.findById(id);
  }

  @Get(':id/pagos-proyectados')
  @ApiOperation({ summary: 'Pagos proyectados del préstamo' })
  @ApiResponse({ status: 200, type: [PagoProyectadoDto] })
  getPagosProyectados(@Param('id', ParseIntPipe) id: number) {
    return this.pagosService.pagosProyectados(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un pago' })
  update(@Req() req, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePagoDto) {
    return this.pagosService.update(id, dto, req.user?.id ?? 0);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Actualizar el estado de un pago' })
  actualizarEstado(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstadoPagoDto,
  ) {
    return this.pagosService.actualizarEstado(id, dto.estadoId, req.user?.id ?? 0);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un pago' })
  delete(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.pagosService.delete(id, req.user?.id ?? 0);
  }
}
