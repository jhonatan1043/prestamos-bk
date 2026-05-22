import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { TenantService } from '../application/tenant.service';
import { CreateTenantDto } from '../application/dto/create-tenant.dto';
import { UpdateTenantDto } from '../application/dto/update-tenant.dto';
import { CreatePagoTenantDto } from '../application/dto/create-pago-tenant.dto';

@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  // ─── Tenants CRUD ─────────────────────────────────────────────────────────

  /**
   * POST /tenants
   * Registra un nuevo cliente de la aplicación.
   * Crea automáticamente su esquema PostgreSQL y corre las migraciones.
   */
  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  /**
   * GET /tenants
   * Lista todos los tenants con su plan asignado.
   */
  @Get()
  findAll() {
    return this.tenantService.findAll();
  }

  /**
   * GET /tenants/resumen-economico
   * Resumen económico global: ingresos por tenant y total.
   */
  @Get('resumen-economico')
  resumenEconomico() {
    return this.tenantService.resumenEconomico();
  }

  /**
   * GET /tenants/:id
   * Detalle de un tenant.
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tenantService.findOne(id);
  }

  /**
   * PATCH /tenants/:id
   * Actualiza datos del tenant (nombre, email, plan, estado, notas).
   */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantService.update(id, dto);
  }

  /**
   * POST /tenants/:id/reprovision
   * Reintenta crear el esquema y correr las migraciones
   * (útil si el tenant quedó SUSPENDIDO por fallo de provisión).
   */
  @Post(':id/reprovision')
  reprovision(@Param('id', ParseIntPipe) id: number) {
    return this.tenantService.reprovision(id);
  }

  /**
   * DELETE /tenants/:id
   * Elimina un tenant (solo si está SUSPENDIDO o CANCELADO).
   */
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tenantService.remove(id);
  }

  // ─── Pagos del tenant ─────────────────────────────────────────────────────

  /**
   * POST /tenants/:id/pagos
   * Registra un ingreso económico para el tenant.
   */
  @Post(':id/pagos')
  registrarPago(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePagoTenantDto,
  ) {
    return this.tenantService.registrarPago(id, dto);
  }

  /**
   * GET /tenants/:id/pagos
   * Lista todos los pagos de un tenant.
   */
  @Get(':id/pagos')
  findPagos(@Param('id', ParseIntPipe) id: number) {
    return this.tenantService.findPagos(id);
  }

  /**
   * GET /tenants/:id/pagos/:pagoId
   * Detalle de un pago específico.
   */
  @Get(':id/pagos/:pagoId')
  findPago(
    @Param('id', ParseIntPipe) id: number,
    @Param('pagoId', ParseIntPipe) pagoId: number,
  ) {
    return this.tenantService.findPagoById(id, pagoId);
  }
}
