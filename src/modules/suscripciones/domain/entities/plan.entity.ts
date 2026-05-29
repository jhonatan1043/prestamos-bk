import { ApiProperty } from '@nestjs/swagger';

export class Plan {
  @ApiProperty() id: number;
  @ApiProperty() nombre: string;
  @ApiProperty({ required: false }) descripcion?: string;
  @ApiProperty({ description: '-1 = ilimitado' }) maxUsuarios: number;
  @ApiProperty({ description: '-1 = ilimitado' }) maxClientes: number;
  @ApiProperty({ description: '-1 = ilimitado' }) maxPrestamosPorCliente: number;
  @ApiProperty() precio: number;
  @ApiProperty({ default: 30, description: 'Días de vigencia de la suscripción' }) duracionDias: number;
  @ApiProperty() activo: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
