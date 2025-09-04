import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import type { IPrestamoRepository } from '../domain/repositories/prestamo.repository';
import { Prestamo } from '../domain/entities/prestamo.entity';

@Injectable()
export class PrestamosService {
  constructor(
    @Inject('IPrestamoRepository')
    private readonly prestamoRepository: IPrestamoRepository,
  ) {}

  async create(data: Omit<Prestamo, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.prestamoRepository.create(data);
  }

  async findAll() {
    return this.prestamoRepository.findAll();
  }

  async findById(id: number) {
    const prestamo = await this.prestamoRepository.findById(id);
    if (!prestamo) throw new NotFoundException('Préstamo no encontrado');
    return prestamo;
  }

  async update(id: number, data: Partial<Prestamo>) {
    return this.prestamoRepository.update(id, data);
  }

  async delete(id: number) {
    return this.prestamoRepository.delete(id);
  }
}
