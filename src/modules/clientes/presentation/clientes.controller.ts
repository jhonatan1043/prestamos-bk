import { Controller, Post, Body, Get, Param, UseGuards, Put, Delete, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiExtraModels } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/jwt-auth.guard';
import { ClientesService } from '../application/clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { Cliente } from '../domain/entities/cliente.entity';

@ApiTags('clientes')
@ApiExtraModels(UpdateClienteDto)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo cliente' })
  @ApiBody({ type: CreateClienteDto })
  @ApiResponse({ status: 201, type: Cliente })
  create(@Req() req, @Body() dto: CreateClienteDto) {
    return this.clientesService.create(dto, req.user?.id ?? 0);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los clientes' })
  @ApiResponse({ status: 200, type: [Cliente] })
  findAll() {
    return this.clientesService.findAll();
  }

  @Get('disponibles')
  @ApiOperation({ summary: 'Listar clientes sin préstamo activo' })
  @ApiResponse({ status: 200, type: [Cliente] })
  findDisponibles() {
    return this.clientesService.findDisponibles();
  }

  @Get('cobrador/:cobradorId')
  @ApiOperation({ summary: 'Listar clientes por cobrador' })
  @ApiParam({ name: 'cobradorId', type: Number })
  @ApiResponse({ status: 200, type: [Cliente] })
  findByCobrador(@Param('cobradorId') cobradorId: string) {
    return this.clientesService.findByCobrador(Number(cobradorId));
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Obtener un cliente por ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: Cliente })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  findOne(@Param('id') id: string) {
    return this.clientesService.findOne(+id);
  }

  @Get(':identificacion')
  @ApiOperation({ summary: 'Buscar cliente por número de identificación' })
  @ApiParam({ name: 'identificacion', type: String })
  @ApiResponse({ status: 200, type: Cliente })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  buscarPorIdentificacion(@Param('identificacion') identificacion: string) {
    return this.clientesService.buscarPorIdentificacion(identificacion);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un cliente por ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateClienteDto })
  @ApiResponse({ status: 200, type: Cliente })
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdateClienteDto) {
    return this.clientesService.update(+id, dto, req.user?.id ?? 0);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un cliente por ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Cliente eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  remove(@Req() req, @Param('id') id: string) {
    return this.clientesService.remove(+id, req.user?.id ?? 0);
  }
}
