import { Controller, Get, Param, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { CreateEstadoDto } from '../application/dto/create-estado.dto';
import { EstadosService } from '../application/estados.service';

@Controller('estados')
export class EstadosController {
  constructor(private readonly estadosService: EstadosService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateEstadoDto) {
    return this.estadosService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.estadosService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findById(@Param('id') id: number) {
    return this.estadosService.findById(Number(id));
  }
}
