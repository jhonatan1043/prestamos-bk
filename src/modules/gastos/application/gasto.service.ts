import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import type { IGastoRepository } from '../domain/repositories/gasto.repository';
import { Gasto } from '../domain/entities/gasto.entity';
import { CreateGastoDto } from './dto/create-gasto.dto';
import { UpdateGastoDto } from './dto/update-gasto.dto';

@Injectable()
export class GastosService {
  constructor(
    @Inject('IGastoRepository')
    private readonly gastosRepository: IGastoRepository
  ) {}

  async findAll(): Promise<Gasto[]> {
    return this.gastosRepository.findAll();
  }

  async findById(id: number): Promise<Gasto> {
    const gasto = await this.gastosRepository.findById(id);
    if (!gasto) throw new NotFoundException('Gasto no encontrado');
    return gasto;
  }

  async create(createGastoDto: CreateGastoDto): Promise<Gasto> {
    const gasto = new Gasto(
      0, // El ID lo asigna la base de datos
      createGastoDto.descripcion,
      createGastoDto.monto,
      createGastoDto.fecha,
      createGastoDto.categoria,
      createGastoDto.usuarioId,
    );
    return this.gastosRepository.create(gasto);
  }

  async update(id: number, updateGastoDto: UpdateGastoDto): Promise<Gasto> {
    const gasto = await this.gastosRepository.findById(id);
    if (!gasto) throw new NotFoundException('Gasto no encontrado');
    Object.assign(gasto, updateGastoDto);
    return this.gastosRepository.update(id, gasto);
  }

  async remove(id: number): Promise<void> {
    const gasto = await this.gastosRepository.findById(id);
    if (!gasto) throw new NotFoundException('Gasto no encontrado');
    await this.gastosRepository.remove(id);
  }
}