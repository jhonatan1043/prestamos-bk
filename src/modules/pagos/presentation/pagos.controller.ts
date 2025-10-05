// src/modules/pagos/presentation/pagos.controller.ts
import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    ParseIntPipe,
    UseGuards,
} from '@nestjs/common';
import { PagosService } from '../application/pagos.service';
import { CreatePagoDto } from '../application/dto/create-pago.dto';
import { UpdatePagoDto } from '../application/dto/update-pago.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/jwt-auth.guard';

@ApiTags('pagos')
@ApiBearerAuth() // 🔑 Swagger muestra el candado y permite poner el token
@UseGuards(JwtAuthGuard) // 🔒 protege todas las rutas del controlador
@Controller('pagos')
export class PagosController {
    constructor(private readonly pagosService: PagosService) { }

    @Post()
    @ApiOperation({ summary: 'Registrar un pago' })
    @ApiResponse({ status: 201, description: 'Pago creado exitosamente' })
    create(@Body() dto: CreatePagoDto) {
        return this.pagosService.create(dto);
    }

    @Get('mora')
    @ApiOperation({ summary: 'Obtener préstamos en mora por más de 30 días' })
    @ApiResponse({ status: 200, description: 'Listado de préstamos en mora', type: [CreatePagoDto] })
    findPrestamosEnMora() {
        return this.pagosService.prestamosEnMora();
    }

    @Get('historial-cancelados')
    @ApiOperation({ summary: 'Historial de pagos de préstamos cancelados' })
    @ApiResponse({ status: 200, description: 'Historial de pagos cancelados', type: [CreatePagoDto] })
    historialPagosCancelados() {
        return this.pagosService.historialPagosCancelados();
    }

    @Get('saldo/:prestamoId')
    @ApiOperation({ summary: 'Saldo pendiente de un préstamo' })
    @ApiResponse({ status: 200, description: 'Saldo pendiente', type: Number })
    saldoPendientePrestamo(@Param('prestamoId', ParseIntPipe) prestamoId: number) {
        return this.pagosService.saldoPendientePrestamo(prestamoId);
    }

    @Get()
    @ApiOperation({ summary: 'Obtener todos los pagos' })
    @ApiResponse({ status: 200, description: 'Listado de pagos', type: [CreatePagoDto] })
    findAll() {
        return this.pagosService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un pago por ID' })
    @ApiResponse({ status: 200, description: 'Pago encontrado', type: CreatePagoDto })
    @ApiResponse({ status: 404, description: 'Pago no encontrado' })
    findById(@Param('id', ParseIntPipe) id: number) {
        return this.pagosService.findById(id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Actualizar un pago' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdatePagoDto,
    ) {
        return this.pagosService.update(id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar un pago' })
    delete(@Param('id', ParseIntPipe) id: number) {
        return this.pagosService.delete(id);
    }
}
