import { Ruta } from '../entities/ruta.entity';
import { RutaResumenDto } from '../../application/dto/ruta-resumen.dto';
import { RutaResumenDetalladoDto } from '../../application/dto/ruta-resumen-detallado.dto';

export interface IRutaRepository {
  findAll(): Promise<Ruta[]>;
  create(ruta: Ruta): Promise<Ruta>;
  findAllResumenDetallado(): Promise<RutaResumenDetalladoDto[]>;
}
