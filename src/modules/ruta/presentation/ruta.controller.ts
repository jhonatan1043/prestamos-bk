import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { RutaService } from '../application/ruta.service';
import { CreateRutaDto } from '../application/dto/create-ruta.dto';

@ApiTags('rutas')
@ApiBearerAuth()
@Controller('rutas')
export class RutaController {
  constructor(private readonly rutaService: RutaService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una ruta' })
  @ApiResponse({ status: 201, description: 'Ruta creada correctamente.' })
  @ApiBody({ type: CreateRutaDto })
  create(@Body() dto: CreateRutaDto) {
    return this.rutaService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las rutas' })
  @ApiResponse({ status: 200, description: 'Lista de rutas obtenida correctamente.' })
  findAll() {
    return this.rutaService.findAll();
  }
}
