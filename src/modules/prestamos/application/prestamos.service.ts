import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import type { IPrestamoRepository } from '../domain/repositories/prestamo.repository';
import { Prestamo } from '../domain/entities/prestamo.entity';

@Injectable()
export class PrestamosService {
  constructor(
    @Inject('IPrestamoRepository')
    private readonly prestamoRepository: IPrestamoRepository,
  ) {}

  async create(data: import('./dto/create-prestamo.dto').CreatePrestamoDto) {
    // Validar tasa
    if (data.tasa < 0 || data.tasa > 100) {
      throw new (await import('@nestjs/common')).BadRequestException('La tasa debe estar entre 0% y 100%');
    }
    // Validar plazo
    if (data.plazoDias <= 0 || data.plazoDias > 365) {
      throw new (await import('@nestjs/common')).BadRequestException('El plazo debe estar entre 1 y 365 días');
    }
    // Validar fecha de inicio
    if (new Date(data.fechaInicio) <= new Date()) {
      throw new (await import('@nestjs/common')).BadRequestException('La fecha de inicio no puede ser en el pasado');
    }
    // Validar estado usando estadoId
    const estadosValidos = ['ACTIVO', 'CANCELADO', 'FINALIZADO'];
    // Suponiendo que tienes acceso a PrismaService como this.prisma
    const estado = await this['prisma']?.estado.findUnique?.({ where: { id: data.estadoId } });
    if (!estado || !estadosValidos.includes(estado.nombre)) {
      throw new (await import('@nestjs/common')).BadRequestException('Estado inválido');
    }
    // Validar código único
    const prestamos = await this.prestamoRepository.findAll();
    if (prestamos.some(p => p.codigo === data.codigo)) {
      throw new (await import('@nestjs/common')).ConflictException('Ya existe un préstamo con ese código');
    }
    // Validar que el cliente no tenga un préstamo activo
    const tienePrestamoActivo = prestamos.some(
      p => p.clienteId === data.clienteId && p.estado?.nombre === 'ACTIVO'
    );
    if (tienePrestamoActivo) {
      throw new (await import('@nestjs/common')).ConflictException('El cliente ya tiene un préstamo activo');
    }
    // Validar existencia de cliente y usuario (simulado, deberías consultar los repositorios reales)
    // Ejemplo: if (!(await clienteRepository.findById(data.clienteId))) throw new NotFoundException('Cliente no existe');
    // Ejemplo: if (!(await usuarioRepository.findById(data.usuarioId))) throw new NotFoundException('Usuario no existe');
    // usuarioId ya viene en data
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
