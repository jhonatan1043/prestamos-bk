import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { ProveedoresService } from '../application/proveedores.service';
import { CreateProveedorDto } from '../application/dto/create-proveedor.dto';

@ApiTags('proveedores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly service: ProveedoresService) {}

  @Post()
  @ApiOperation({ summary: 'Crear proveedor' })
  create(@Body() dto: CreateProveedorDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar proveedores activos' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener proveedor por ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar proveedor' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateProveedorDto>) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar proveedor' })
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
