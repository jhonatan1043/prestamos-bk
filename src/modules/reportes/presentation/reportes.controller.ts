import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { ReportesService } from '../application/reportes.service';

@ApiTags('reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('estado-resultados')
  @ApiOperation({ summary: 'Estado de resultados mensual (P&L)' })
  @ApiQuery({ name: 'year',  type: Number, required: false, example: 2025 })
  @ApiQuery({ name: 'month', type: Number, required: false, example: 6 })
  estadoResultados(
    @Query('year')  year?:  string,
    @Query('month') month?: string,
  ) {
    const hoy = new Date();
    return this.reportesService.estadoResultados(
      year  ? +year  : hoy.getFullYear(),
      month ? +month : hoy.getMonth() + 1,
    );
  }

  @Get('estado-resultados/historial')
  @ApiOperation({ summary: 'P&L de los últimos N meses' })
  @ApiQuery({ name: 'meses', type: Number, required: false, example: 6 })
  historialResultados(@Query('meses') meses?: string) {
    return this.reportesService.estadoResultadosMultiperiodo(meses ? +meses : 6);
  }

  @Get('cartera')
  @ApiOperation({ summary: 'Dashboard de calidad de cartera (PAR30/60/90, mora, recuperación)' })
  dashboardCartera() {
    return this.reportesService.dashboardCartera();
  }

  @Get('rentabilidad-rutas')
  @ApiOperation({ summary: 'Rentabilidad y ROI por ruta de cobro' })
  rentabilidadRutas() {
    return this.reportesService.rentabilidadRutas();
  }
}
