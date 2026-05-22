import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/jwt-auth.guard';
import { PlanService } from '../application/plan.service';
import { CreatePlanDto } from '../application/dto/create-plan.dto';
import { UpdatePlanDto } from '../application/dto/update-plan.dto';
import { Plan } from '../domain/entities/plan.entity';

@ApiTags('suscripciones/planes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('suscripciones/planes')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un plan' })
  @ApiResponse({ status: 201, type: Plan })
  create(@Body() dto: CreatePlanDto) {
    return this.planService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los planes' })
  @ApiResponse({ status: 200, type: [Plan] })
  findAll() {
    return this.planService.findAll();
  }

  @Get('activos')
  @ApiOperation({ summary: 'Listar planes activos' })
  @ApiResponse({ status: 200, type: [Plan] })
  findActivos() {
    return this.planService.findActivos();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener plan por ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: Plan })
  @ApiResponse({ status: 404, description: 'Plan no encontrado' })
  findById(@Param('id') id: string) {
    return this.planService.findById(+id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar plan' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: Plan })
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.planService.update(+id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar plan' })
  @ApiParam({ name: 'id', type: Number })
  remove(@Param('id') id: string) {
    return this.planService.remove(+id);
  }
}
