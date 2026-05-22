import { ApiProperty } from '@nestjs/swagger';
import { Plan } from './plan.entity';

export type EstadoSuscripcion = 'ACTIVA' | 'VENCIDA' | 'CANCELADA';

export class Suscripcion {
  @ApiProperty() id: number;
  @ApiProperty() tenantId: number;
  @ApiProperty() planId: number;
  @ApiProperty() fechaInicio: Date;
  @ApiProperty({ required: false }) fechaFin?: Date;
  @ApiProperty({ enum: ['ACTIVA', 'VENCIDA', 'CANCELADA'] }) estado: EstadoSuscripcion;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ type: () => Plan, required: false }) plan?: Plan;
}
