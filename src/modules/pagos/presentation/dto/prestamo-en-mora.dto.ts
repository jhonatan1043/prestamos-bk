import { CreatePagoDto } from '../../application/dto/create-pago.dto';
import { CreateClienteDto } from '../../../clientes/presentation/dto/create-cliente.dto';

export class PrestamoEnMoraDto {
  id: number;
  cliente: CreateClienteDto;
  pagos: CreatePagoDto[];
  montoPrestamo: number;
  totalPagado: number;
  saldoPendiente: number;
  fechaLimite: Date;
}
