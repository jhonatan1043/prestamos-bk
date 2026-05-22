import { ApiProperty } from '@nestjs/swagger';

export class Plan {
  @ApiProperty() id: number;
  @ApiProperty() nombre: string;
  @ApiProperty({ required: false }) descripcion?: string;
  @ApiProperty({ description: '-1 = ilimitado' }) maxUsuarios: number;
  @ApiProperty({ description: '-1 = ilimitado' }) maxClientes: number;
  @ApiProperty({ description: '-1 = ilimitado' }) maxPrestamosPorCliente: number;
  @ApiProperty() precio: number;
  @ApiProperty() activo: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
