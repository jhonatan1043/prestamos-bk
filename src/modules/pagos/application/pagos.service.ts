// src/modules/pagos/application/pagos.service.ts
import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import type { IPagoRepository } from '../domain/repositories/pago.repository';
import { Pago } from '../domain/entities/pago.entity';
import { CreatePagoDto } from './dto/create-pago.dto';
import { UpdatePagoDto } from './dto/update-pago.dto';

@Injectable()
export class PagosService {
  constructor(
    @Inject('IPagoRepository')
    private readonly pagoRepository: IPagoRepository,
  ) {}

  async create(dto: CreatePagoDto): Promise<Pago> {
    return this.pagoRepository.create(dto);
  }

  async findAll(): Promise<Pago[]> {
    return this.pagoRepository.findAll();
  }

  async findById(id: number): Promise<Pago> {
    const pago = await this.pagoRepository.findById(id);
    if (!pago) throw new NotFoundException('Pago no encontrado');
    return pago;
  }

  async update(id: number, dto: UpdatePagoDto): Promise<Pago> {
    return this.pagoRepository.update(id, dto);
  }

  async delete(id: number): Promise<void> {
    return this.pagoRepository.delete(id);
  }
}
