import { HttpException, HttpStatus } from '@nestjs/common';
import { Plan } from '../entities/plan.entity';

export interface LimiteExcedidoData {
  recurso: 'usuarios' | 'clientes' | 'prestamos';
  limiteActual: number;
  planActual: Partial<Plan>;
  planesSuperiores: Partial<Plan>[];
}

export class LimiteExcedidoException extends HttpException {
  constructor(data: LimiteExcedidoData) {
    const mensajes: Record<string, string> = {
      usuarios:   `Has alcanzado el límite de ${data.limiteActual} usuario(s) en el plan "${data.planActual.nombre}"`,
      clientes:   `Has alcanzado el límite de ${data.limiteActual} cliente(s) en el plan "${data.planActual.nombre}"`,
      prestamos:  `Has alcanzado el límite de ${data.limiteActual} préstamo(s) por cliente en el plan "${data.planActual.nombre}"`,
    };

    super(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        error: 'LIMITE_EXCEDIDO',
        mensaje: mensajes[data.recurso],
        recurso: data.recurso,
        planActual: {
          nombre: data.planActual.nombre,
          maxUsuarios: data.planActual.maxUsuarios,
          maxClientes: data.planActual.maxClientes,
          maxPrestamosPorCliente: data.planActual.maxPrestamosPorCliente,
          precio: data.planActual.precio,
        },
        planesDisponibles: data.planesSuperiores.map(p => ({
          id: p.id,
          nombre: p.nombre,
          descripcion: p.descripcion,
          maxUsuarios: p.maxUsuarios,
          maxClientes: p.maxClientes,
          maxPrestamosPorCliente: p.maxPrestamosPorCliente,
          precio: p.precio,
        })),
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
