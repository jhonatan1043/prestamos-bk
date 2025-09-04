import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { UserService } from '../application/user.service';
import { CreateUserDto } from '../application/dto/create-user.dto';
import { UpdateUserDto } from '../application/dto/update-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/jwt-auth.guard';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Post()
  @ApiOperation({ summary: 'Crear usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado' })
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Get()
  @ApiBearerAuth() // 🔑 Swagger muestra el candado y permite poner el token
  @UseGuards(JwtAuthGuard) // 🔒 protege todas las rutas del controlador
  @ApiOperation({ summary: 'Listar usuarios' })
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth() // 🔑 Swagger muestra el candado y permite poner el token
  @UseGuards(JwtAuthGuard) // 🔒 protege todas las rutas del controlador
  @ApiOperation({ summary: 'Obtener usuario por ID' })
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
