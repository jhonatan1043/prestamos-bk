import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/jwt-auth.guard';
import { SuscripcionService } from '../application/suscripcion.service';
import { LimitesService } from '../application/limites.service';
import { CreateSuscripcionDto } from '../application/dto/create-suscripcion.dto';
import { RenovarSuscripcionDto } from '../application/dto/renovar-suscripcion.dto';
import { Suscripcion } from '../domain/entities/suscripcion.entity';

@ApiTags('suscripciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('suscripciones')
export class SuscripcionController {
  constructor(
    private readonly suscripcionService: SuscripcionService,
    private readonly limitesService: LimitesService,
  ) {}

  @Post('activar')
  @ApiOperation({ summary: 'Activar un plan (cancela el actual si existe)' })
  @ApiResponse({ status: 201, type: Suscripcion })
  activar(@Body() dto: CreateSuscripcionDto) {
    return this.suscripcionService.activar(dto);
  }

  @Post('renovar')
  @ApiOperation({ summary: 'Renovar suscripción tras pago aprobado en Wompi' })
  @ApiResponse({ status: 201, type: Suscripcion, description: 'Nueva suscripción activa' })
  @ApiResponse({ status: 400, description: 'Pago no aprobado o referencia inválida' })
  renovar(@Body() dto: RenovarSuscripcionDto) {
    return this.suscripcionService.renovar(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Historial de suscripciones' })
  @ApiResponse({ status: 200, type: [Suscripcion] })
  findAll() {
    return this.suscripcionService.findAll();
  }

  @Get('activa')
  @ApiOperation({ summary: 'Obtener suscripción activa' })
  @ApiResponse({ status: 200, type: Suscripcion })
  @ApiResponse({ status: 404, description: 'No hay suscripción activa' })
  findActiva() {
    return this.suscripcionService.findActiva();
  }

  @Get('estado')
  @ApiOperation({ summary: 'Ver uso actual vs límites del plan activo' })
  @ApiResponse({
    status: 200,
    description: 'Estado de uso: usuarios, clientes y préstamos vs. límites del plan',
  })
  estadoActual() {
    return this.limitesService.obtenerEstadoActual();
  }

  @Delete(':id/cancelar')
  @ApiOperation({ summary: 'Cancelar una suscripción' })
  @ApiParam({ name: 'id', type: Number })
  cancelar(@Param('id') id: string) {
    return this.suscripcionService.cancelar(+id);
  }
}
