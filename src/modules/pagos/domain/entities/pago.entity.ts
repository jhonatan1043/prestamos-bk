import { Decimal } from "@prisma/client/runtime/binary";

export class Pago {
  id: number;
  prestamoId: number;
  fecha: Date;
  monto: Decimal;
}
