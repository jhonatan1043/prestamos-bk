import { Injectable, Inject } from '@nestjs/common';
import type { IRutaRepository } from '../domain/repositories/ruta.repository';
import { Ruta } from '../domain/entities/ruta.entity';
import { CreateRutaDto } from './dto/create-ruta.dto';

@Injectable()
export class RutaService {
  constructor(
    @Inject('IRutaRepository')
    private readonly rutaRepository: IRutaRepository
  ) {}

  async create(dto: CreateRutaDto) {
    // Aquí deberías mapear CreateRutaDto a Ruta si es necesario
    const ruta = new Ruta();
    ruta.nombre = dto.nombre;
    ruta.sector = dto.sector;
    ruta.cobradorId = dto.cobradorId;
    // id se asigna en la base de datos
    return this.rutaRepository.create(ruta);
  }

  async findAll() {
    return this.rutaRepository.findAll();
  }
}
