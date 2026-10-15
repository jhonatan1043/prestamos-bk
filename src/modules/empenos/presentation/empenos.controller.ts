import {
  BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { Roles, RolesGuard } from '../../../common/auth/roles.guard';
import { AdminWebGuard } from '../../../common/auth/admin-web.guard';
import { EmpenosService } from '../application/empenos.service';
import { EmpenoPagosService } from '../application/empeno-pagos.service';
import { EmpenoReportesService } from '../application/empeno-reportes.service';
import { CreateEmpenoDto } from '../application/dto/create-empeno.dto';
import { UpdateEmpenoDto } from '../application/dto/update-empeno.dto';
import { FiltrosEmpenoDto } from '../application/dto/filtros-empeno.dto';
import { CreatePagoEmpenoDto } from '../application/dto/create-pago-empeno.dto';
import { UpdatePagoEmpenoDto } from '../application/dto/update-pago-empeno.dto';
import { SalidaEmpenoDto } from '../application/dto/salida-empeno.dto';
import { MovimientosQueryDto } from '../application/dto/movimientos-query.dto';

@ApiTags('empenos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('empenos')
export class EmpenosController {
  constructor(
    private readonly empenos:  EmpenosService,
    private readonly pagos:    EmpenoPagosService,
    private readonly reportes: EmpenoReportesService,
  ) {}

  // ─── Rutas literales (antes de :id) ──────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Listar empeños — admin ve todos, cobrador solo los suyos' })
  listar(@Req() req, @Query() filtros: FiltrosEmpenoDto) {
    return this.empenos.listar(filtros, req.user);
  }

  @Get('resumen')
  @ApiOperation({ summary: 'Totales: activos, vencidos, por vencer, capital e interés por cobrar' })
  resumen(@Req() req) {
    return this.reportes.resumen(req.user);
  }

  @Get('movimientos')
  @ApiOperation({ summary: 'Reporte de entradas y salidas por rango de fechas' })
  movimientos(@Req() req, @Query() q: MovimientosQueryDto) {
    return this.reportes.movimientos({ desde: new Date(q.desde), hasta: new Date(q.hasta), tipo: q.tipo }, req.user);
  }

  @Get('cliente/:clienteId')
  @ApiOperation({ summary: 'Empeños de un cliente con totales' })
  porCliente(@Req() req, @Param('clienteId', ParseIntPipe) clienteId: number) {
    return this.reportes.porCliente(clienteId, req.user);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar empeño' })
  crear(@Req() req, @Body() dto: CreateEmpenoDto) {
    return this.empenos.crear(dto, req.user);
  }

  // ─── Por id ──────────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Detalle con artículo, pagos, movimientos y liquidación a hoy' })
  @ApiQuery({ name: 'incluirEliminados', required: false, description: 'Solo admin' })
  obtener(@Req() req, @Param('id', ParseIntPipe) id: number, @Query('incluirEliminados') incluirEliminados?: string) {
    return this.empenos.obtener(id, req.user, { incluirEliminados: incluirEliminados === 'true' });
  }

  @Get(':id/liquidacion')
  @ApiOperation({ summary: 'Interés adeudado y total para rescatar a una fecha' })
  @ApiQuery({ name: 'fecha', required: false })
  liquidacion(@Req() req, @Param('id', ParseIntPipe) id: number, @Query('fecha') fecha?: string) {
    const corte = fecha ? new Date(fecha) : undefined;
    if (corte && isNaN(corte.getTime())) throw new BadRequestException('fecha inválida');
    return this.pagos.liquidacion(id, req.user, corte);
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Editar empeño (admin)' })
  actualizar(@Req() req, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmpenoDto) {
    return this.empenos.actualizar(id, dto, req.user);
  }

  @Post(':id/pagos')
  @ApiOperation({ summary: 'Registrar pago: refrendo (INTERES), abono a capital o rescate (CANCELACION)' })
  registrarPago(@Req() req, @Param('id', ParseIntPipe) id: number, @Body() dto: CreatePagoEmpenoDto) {
    return this.pagos.registrarPago(id, dto, req.user);
  }

  @Put(':id/pagos/:pagoId')
  @Roles('admin')
  @ApiOperation({ summary: 'Editar pago (admin) — recalcula el empeño' })
  editarPago(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('pagoId', ParseIntPipe) pagoId: number,
    @Body() dto: UpdatePagoEmpenoDto,
  ) {
    return this.pagos.editarPago(id, pagoId, dto, req.user);
  }

  @Post(':id/salida')
  @ApiOperation({ summary: 'Registrar salida de un empeño vencido (vendido o adjudicado)' })
  registrarSalida(@Req() req, @Param('id', ParseIntPipe) id: number, @Body() dto: SalidaEmpenoDto) {
    return this.pagos.registrarSalida(id, dto, req.user);
  }

  @Delete(':id')
  @Roles('admin')
  @UseGuards(AdminWebGuard)
  @ApiOperation({ summary: 'Eliminar empeño (soft delete) — solo admin desde el panel web' })
  async eliminar(@Req() req, @Param('id', ParseIntPipe) id: number) {
    await this.empenos.eliminar(id, req.user);
    return { eliminado: true };
  }

  @Delete(':id/pagos/:pagoId')
  @Roles('admin')
  @UseGuards(AdminWebGuard)
  @ApiOperation({ summary: 'Eliminar pago (soft delete) — solo admin desde el panel web' })
  eliminarPago(@Req() req, @Param('id', ParseIntPipe) id: number, @Param('pagoId', ParseIntPipe) pagoId: number) {
    return this.pagos.eliminarPago(id, pagoId, req.user);
  }
}
