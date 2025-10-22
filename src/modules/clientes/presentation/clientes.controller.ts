import { Controller, Post, Body, Get, Param, UseGuards, Put, Delete } from '@nestjs/common';
import { ClientesService } from '../application//clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiExtraModels } from '@nestjs/swagger';
import { Cliente } from '../domain/entities/cliente.entity';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/jwt-auth.guard';

@ApiTags('clientes') // 🔑 Agrupa todos los endpoints bajo "clientes"
@ApiExtraModels(UpdateClienteDto)
@ApiBearerAuth() // 🔑 Swagger muestra el candado y permite poner el token
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

    @Get(':identificacion')
    @ApiOperation({ summary: 'Buscar cliente por número de identificación' })
    @ApiParam({ name: 'identificacion', type: String, description: 'Número de identificación del cliente' })
    @ApiResponse({ status: 200, description: 'Cliente encontrado', type: Cliente })
    @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
    async buscarPorIdentificacion(@Param('identificacion') identificacion: string) {
      return await this.clientesService.buscarPorIdentificacion(identificacion);
    }

  @Post()
    @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Crear un nuevo cliente' })
  @ApiResponse({ status: 201, description: 'Cliente creado exitosamente', type: Cliente })
  @ApiBody({ type: CreateClienteDto })
  async create(@Body() dto: CreateClienteDto) {
    return await this.clientesService.create(dto);
  }

  @Get()
    @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar todos los clientes' })
  @ApiResponse({ status: 200, description: 'Listado de clientes retornado', type: [Cliente] })
  async findAll() {
    return await this.clientesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un cliente por ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del cliente' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado', type: Cliente })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async findOne(@Param('id') id: string) {
    return await this.clientesService.findOne(+id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un cliente por ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del cliente' })
  @ApiResponse({ status: 200, description: 'Cliente actualizado exitosamente', type: Cliente })
  @ApiBody({ type: UpdateClienteDto })
  async update(@Param('id') id: string, @Body() dto: UpdateClienteDto) {
    return await this.clientesService.update(+id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un cliente por ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del cliente' })
  @ApiResponse({ status: 200, description: 'Cliente eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async remove(@Param('id') id: string) {
    return await this.clientesService.remove(+id);
  }
}
