import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as clienteRepository from '../domain/repositories/cliente.repository';
import { CreateClienteDto } from '../presentation/dto/create-cliente.dto';
import { UpdateClienteDto } from '../presentation/dto/update-cliente.dto';
import { Cliente } from '../domain/entities/cliente.entity';

@Injectable()
export class ClientesService {
  constructor(
    @Inject('IClienteRepository')
    private readonly clienteRepository: clienteRepository.IClienteRepository,
  ) {}

  async create(dto: CreateClienteDto) {
    const cliente = new Cliente(
      null,
      dto.tipoIdentificacion,
      dto.identificacion,
      dto.nombres,
      dto.apellidos,
      dto.edad,
    );
    return this.clienteRepository.create(cliente);
  }

  async findAll() {
    return this.clienteRepository.findAll();
  }

  async findOne(id: number) {
    const cliente = await this.clienteRepository.findById(id);
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    return cliente;
  }

  async update(id: number, dto: UpdateClienteDto) {
    const cliente = new Cliente(
      id,
      dto.tipoIdentificacion ?? '',
      dto.identificacion ?? '',
      dto.nombres ?? '',
      dto.apellidos ?? '',
      dto.edad,
    );
    return this.clienteRepository.update(cliente);
  }

  async remove(id: number) {
    return this.clienteRepository.remove(id);
  }
}
