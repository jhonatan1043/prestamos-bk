import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsDateString, IsInt } from 'class-validator';

export class CreatePrestamoDto {
    @ApiProperty({ example: 'PRE-001' })
    @IsString()
    codigo: string;

    @ApiProperty({ example: 5000.00 })
    @IsNumber()
    monto: number;

    @ApiProperty({ example: 5.5 })
    @IsNumber()
    tasa: number;


    @ApiProperty({ example: 30 })
    @IsInt()
    plazoDias: number;

    @ApiProperty({ enum: ['DIA', 'SEMANA', 'MES'], example: 'DIA', description: 'Tipo de plazo: día, semana o mes' })
    @IsString()
    tipoPlazo: 'DIA' | 'SEMANA' | 'MES';

    @ApiProperty({ example: '2025-09-04T00:00:00.000Z' })
    @IsDateString()
    fechaInicio: Date;

    @ApiProperty({ example: 1, description: 'ID del estado del préstamo' })
    @IsInt()
    estadoId: number;

    @ApiProperty({ example: 1 })
    @IsInt()
    clienteId: number;

    @ApiProperty({ example: 1, description: 'ID del usuario que realiza el préstamo' })
    @IsInt()
    usuarioId: number;
}
