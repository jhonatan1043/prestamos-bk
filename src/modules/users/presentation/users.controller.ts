import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { UserService } from '../application/user.service';
import { CreateUserDto } from '../application/dto/create-user.dto';
import { UpdateUserDto } from '../application/dto/update-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { User } from '../domain/entities/user.entity';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/jwt-auth.guard';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Crear usuario en el esquema del tenant autenticado' })
  @ApiResponse({ status: 201, description: 'Usuario creado' })
  @ApiResponse({ status: 402, description: 'Límite de usuarios del plan excedido' })
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Get()
  @ApiBearerAuth() // 🔑 Swagger muestra el candado y permite poner el token
  @UseGuards(JwtAuthGuard) // 🔒 protege todas las rutas del controlador
  @ApiOperation({ summary: 'Listar usuarios' })
  @ApiResponse({ status: 200, description: 'Listado de usuarios', type: [User] })
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth() // 🔑 Swagger muestra el candado y permite poner el token
  @UseGuards(JwtAuthGuard) // 🔒 protege todas las rutas del controlador
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado', type: User })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Put(':id')
  @ApiBearerAuth() // 🔑 Swagger muestra el candado y permite poner el token
  @UseGuards(JwtAuthGuard) // 🔒 protege todas las rutas del controlador
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(+id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth() // 🔑 Swagger muestra el candado y permite poner el token
  @UseGuards(JwtAuthGuard) // 🔒 protege todas las rutas del controlador
  @ApiOperation({ summary: 'Eliminar usuario' })
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
