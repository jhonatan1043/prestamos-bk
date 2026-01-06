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
    // Validar si ya existe un cliente con la misma identificación
    const clientes = await this.clienteRepository.findAll();
    const existe = clientes.find(c => c.identificacion === dto.identificacion);
    if (existe) {
      if (existe.active === false) {
        // Reactivar cliente inactivo
        existe.tipoIdentificacion = dto.tipoIdentificacion;
        existe.nombres = dto.nombres;
        existe.apellidos = dto.apellidos;
        existe.direccion = dto.direccion;
        existe.telefono = dto.telefono;
        existe.edad = dto.edad;
        existe.active = true;
        return await this.clienteRepository.update(existe);
      }
      // Lanzar excepción si ya existe activo
      throw new (await import('@nestjs/common')).ConflictException('El cliente ya está registrado');
    }
    const cliente = new Cliente(
      null,
      dto.tipoIdentificacion,
      dto.identificacion,
      dto.nombres,
      dto.apellidos,
      dto.direccion,
      dto.telefono,
      dto.sectorId,
      dto.edad ?? undefined
    );
    return await this.clienteRepository.create(cliente);
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
    // Validar que no se duplique la identificación con otro cliente
    if (dto.identificacion) {
      const clientes = await this.clienteRepository.findAll();
      const existe = clientes.find(c => c.identificacion === dto.identificacion && c.id !== id);
      if (existe) {
        throw new (await import('@nestjs/common')).ConflictException('Ya existe otro cliente con esa identificación');
      }
    }
    const cliente = new Cliente(
      id,
      dto.tipoIdentificacion ?? '',
      dto.identificacion ?? '',
      dto.nombres ?? '',
      dto.apellidos ?? '',
      dto.direccion ?? '',
      dto.telefono ?? '',
      dto.sectorId ?? 0,
      dto.edad ?? undefined,
    );
    return this.clienteRepository.update(cliente);
  }

  async remove(id: number) {
    const cliente = await this.clienteRepository.findById(id);
    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return this.clienteRepository.remove(id);
  }

    async buscarPorIdentificacion(identificacion: string) {
      const clientes = await this.clienteRepository.findAll();
      const cliente = clientes.find(c => c.identificacion === identificacion);
      if (!cliente) throw new NotFoundException('Cliente no encontrado o no está activo');
      return cliente;
    }
}
