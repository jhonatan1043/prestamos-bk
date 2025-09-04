import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { ClientesService } from '../application//clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/jwt-auth.guard';

@ApiTags('clientes') // 🔑 Agrupa todos los endpoints bajo "clientes"
@ApiBearerAuth() // 🔑 Swagger muestra el candado y permite poner el token
@UseGuards(JwtAuthGuard) // 🔒 protege todas las rutas del controlador
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo cliente' })
  @ApiResponse({ status: 201, description: 'Cliente creado exitosamente' })
  async create(@Body() dto: CreateClienteDto) {
    return await this.clientesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los clientes' })
  @ApiResponse({ status: 200, description: 'Listado de clientes retornado' })
  async findAll() {
    return await this.clientesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un cliente por ID' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async findOne(@Param('id') id: string) {
    return await this.clientesService.findOne(+id);
  }

  @Post(':id')
  @ApiOperation({ summary: 'Actualizar un cliente por ID' })
  @ApiResponse({ status: 200, description: 'Cliente actualizado exitosamente' })
  async update(@Param('id') id: string, @Body() dto: UpdateClienteDto) {
    return await this.clientesService.update(+id, dto);
  }

  @Post(':id/delete')
  @ApiOperation({ summary: 'Eliminar un cliente por ID' })
  @ApiResponse({ status: 200, description: 'Cliente eliminado exitosamente' })
  async remove(@Param('id') id: string) {
    return await this.clientesService.remove(+id);
  }
}
