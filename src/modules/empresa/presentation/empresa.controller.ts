import { Controller, Get, Post, Put, Delete, Param, Body, UploadedFile, UseInterceptors, UseGuards } from '@nestjs/common';
import { EmpresaService } from '../application/empresa.service';
import { Empresa } from '../domain/entities/empresa.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/jwt-auth.guard';
import type { Request } from 'express';

@ApiTags('empresa')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('empresa')
export class EmpresaController {
  constructor(private readonly empresaService: EmpresaService) {}

  @Post()
  @ApiOperation({ summary: 'Crear empresa' })
  @ApiResponse({ status: 201, type: Empresa })
  async create(@Body() dto: Partial<Empresa>) {
    // Validar campos obligatorios
    if (!dto.nombre || !dto.ruc || !dto.direccion || !dto.telefono || !dto.correo || !dto.divisa || !dto.codigoPais) {
      throw new Error('Faltan campos obligatorios: nombre, ruc, direccion, telefono, correo, divisa, codigoPais');
    }
    return this.empresaService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar empresas' })
  @ApiResponse({ status: 200, type: [Empresa] })
  async findAll() {
    return this.empresaService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener empresa por id' })
  @ApiResponse({ status: 200, type: Empresa })
  async findById(@Param('id') id: string) {
    return this.empresaService.findById(Number(id));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar empresa' })
  @ApiResponse({ status: 200, type: Empresa })
  async update(@Param('id') id: string, @Body() dto: Partial<Empresa>) {
    // Validar campos obligatorios
    if (!dto.nombre || !dto.ruc || !dto.direccion || !dto.telefono || !dto.correo || !dto.divisa || !dto.codigoPais) {
      throw new Error('Faltan campos obligatorios: nombre, ruc, direccion, telefono, correo, divisa, codigoPais');
    }
    return this.empresaService.update(Number(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar empresa' })
  async remove(@Param('id') id: string) {
    return this.empresaService.remove(Number(id));
  }

  @Post(':id/logo')
  @ApiOperation({ summary: 'Subir logo de empresa' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(@Param('id') id: string, @UploadedFile() file: any) {
    // Aquí deberías guardar el archivo y actualizar el campo logoUrl
    // Ejemplo: guardar en /uploads y actualizar empresa.logoUrl
    // Implementación real depende de tu infraestructura
    return { message: 'Logo subido (implementación pendiente)', fileName: file?.originalname };
  }
}
