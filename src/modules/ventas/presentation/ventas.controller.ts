import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { VentasService } from '../application/ventas.service';
import { CreateVentaDto } from '../application/dto/create-venta.dto';

@ApiTags('ventas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ventas')
export class VentasController {
  constructor(private readonly service: VentasService) {}

  @Post()
  @ApiOperation({ summary: 'Crear venta a crédito y generar cuotas automáticamente' })
  create(@Req() req, @Body() dto: CreateVentaDto) {
    return this.service.create(dto, req.user?.id ?? 0);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las ventas' })
  findAll() {
    return this.service.findAll();
  }

  @Get('cobros-del-dia')
  @ApiOperation({ summary: 'Cuotas de mercancía vencidas hoy (para cobro en campo)' })
  @ApiQuery({ name: 'fecha', required: false, description: 'YYYY-MM-DD, por defecto hoy' })
  cobrosDelDia(@Query('fecha') fecha?: string) {
    return this.service.cobrosDelDia(fecha);
  }

  @Get('cliente/:clienteId')
  @ApiOperation({ summary: 'Ventas de un cliente específico' })
  findByCliente(@Param('clienteId') clienteId: string) {
    return this.service.findByCliente(+clienteId);
  }

  @Get('cliente/:clienteId/cuotas-pendientes')
  @ApiOperation({ summary: 'Cuotas pendientes de pago de un cliente' })
  cuotasPendientes(@Param('clienteId') clienteId: string) {
    return this.service.cuotasPendientesPorCliente(+clienteId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener venta por ID con cuotas' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Post('cuotas/:cuotaId/pagar')
  @ApiOperation({ summary: 'Registrar pago de una cuota de mercancía' })
  pagarCuota(@Param('cuotaId') cuotaId: string) {
    return this.service.pagarCuota(+cuotaId);
  }
}
