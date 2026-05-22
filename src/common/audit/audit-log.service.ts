import { Injectable, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';

export const AuditAction = {
  // Clientes
  CLIENTE_CREAR:    'CLIENTE_CREAR',
  CLIENTE_ACTUALIZAR: 'CLIENTE_ACTUALIZAR',
  CLIENTE_ELIMINAR: 'CLIENTE_ELIMINAR',
  // Préstamos
  PRESTAMO_CREAR:   'PRESTAMO_CREAR',
  PRESTAMO_ACTUALIZAR: 'PRESTAMO_ACTUALIZAR',
  PRESTAMO_ELIMINAR: 'PRESTAMO_ELIMINAR',
  PRESTAMO_ESTADO:  'PRESTAMO_ESTADO',
  // Pagos
  PAGO_CREAR:       'PAGO_CREAR',
  PAGO_ACTUALIZAR:  'PAGO_ACTUALIZAR',
  PAGO_ELIMINAR:    'PAGO_ELIMINAR',
  PAGO_ESTADO:      'PAGO_ESTADO',
} as const;

export type AuditActionType = typeof AuditAction[keyof typeof AuditAction];

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: TenantPrismaService) {}

  async log(
    userId: number,
    action: AuditActionType,
    entity: string,
    entityId: number,
    details: string,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: { userId, action, entity, entityId, details },
      });
      this.logger.log(`[${action}] ${entity}#${entityId} by user#${userId}`);
    } catch (error) {
      // La auditoría nunca debe interrumpir el flujo principal
      this.logger.error(`Error al registrar auditoría [${action}]: ${error.message}`);
    }
  }
}
