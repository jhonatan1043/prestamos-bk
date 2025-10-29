import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RutaService } from '../application/ruta.service';
import { CreateRutaDto } from '../application/dto/create-ruta.dto';

@ApiTags('rutas')
@ApiBearerAuth()
@Controller('rutas')
export class RutaController {
  constructor(private readonly rutaService: RutaService) {}

  @Post()
  create(@Body() dto: CreateRutaDto) {
    return this.rutaService.create(dto);
  }

  @Get()
  findAll() {
    return this.rutaService.findAll();
  }
}
