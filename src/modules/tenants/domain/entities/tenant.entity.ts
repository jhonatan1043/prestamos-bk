export type EstadoTenant = 'ACTIVO' | 'SUSPENDIDO' | 'CANCELADO';

export class Tenant {
  id: number;
  nombre: string;
  email: string;
  telefono?: string | null;
  schemaName: string;
  planId: number;
  estado: EstadoTenant;
  notas?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PagoTenant {
  id: number;
  tenantId: number;
  monto: number;
  concepto: string;
  fecha: Date;
  referencia?: string | null;
  createdAt: Date;
}
