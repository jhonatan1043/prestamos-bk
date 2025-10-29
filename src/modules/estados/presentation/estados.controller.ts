import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { CreateEstadoDto } from '../application/dto/create-estado.dto';
import { EstadosService } from '../application/estados.service';

@Controller('estados')
export class EstadosController {
  @Post()
  async create(@Body() dto: CreateEstadoDto) {
    return this.estadosService.create(dto);
  }
  constructor(private readonly estadosService: EstadosService) {}

  @Get()
  async findAll() {
    return this.estadosService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: number) {
    return this.estadosService.findById(Number(id));
  }
}
