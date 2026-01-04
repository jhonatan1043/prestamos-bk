import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CobradorService } from '../application/cobrador.service';
import { CreateCobradorDto } from '../application/dto/create-cobrador.dto';

@ApiTags('cobradores')
@ApiBearerAuth()
@Controller('cobradores')
export class CobradorController {
  constructor(private readonly cobradorService: CobradorService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un cobrador' })
  @ApiResponse({ status: 201, description: 'Cobrador creado correctamente.' })
  @ApiBody({ type: CreateCobradorDto })
  create(@Body() dto: CreateCobradorDto) {
    return this.cobradorService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los cobradores' })
  @ApiResponse({ status: 200, description: 'Lista de cobradores obtenida correctamente.' })
  findAll() {
    return this.cobradorService.findAll();
  }
}
