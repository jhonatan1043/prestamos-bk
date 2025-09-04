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

    @ApiProperty({ example: '2025-09-04T00:00:00.000Z' })
    @IsDateString()
    fechaInicio: Date;

    @ApiProperty({ example: 'ACTIVO' })
    @IsString()
    estado: string;

    @ApiProperty({ example: 1 })
    @IsInt()
    clienteId: number;
}
