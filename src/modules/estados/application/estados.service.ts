import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { IEstadoRepository } from '../domain/repositories/estado.repository';

@Injectable()
export class EstadosService {
  async create(data: { nombre: string }) {
    return this.estadoRepository.create(data);
  }
  constructor(
    @Inject('IEstadoRepository')
    private readonly estadoRepository: IEstadoRepository
  ) {}

  async findById(id: number) {
    const estado = await this.estadoRepository.findById(id);
    if (!estado) throw new NotFoundException('Estado no encontrado');
    return estado;
  }

  async findAll() {
    return this.estadoRepository.findAll();
  }
}
