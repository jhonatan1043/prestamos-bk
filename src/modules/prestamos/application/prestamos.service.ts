import { UpdateEstadoPrestamoDto } from './dto/update-estado-prestamo.dto';

import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import type { IPrestamoRepository } from '../domain/repositories/prestamo.repository';
import { Prestamo } from '../domain/entities/prestamo.entity';
import type { IEstadoRepository } from '../../estados/domain/repositories/estado.repository';

@Injectable()
export class PrestamosService {
  async findPendientes(userId: number, isAdmin: boolean) {
    const estadoIds = [1, 4];
    console.log('[SERVICE] findPendientes userId:', userId, 'isAdmin:', isAdmin);
    if (isAdmin) {
      const prestamos = await this.prestamoRepository.findByEstados(estadoIds);
      console.log('[SERVICE] findPendientes admin prestamos:', prestamos);
      return prestamos;
    } else {
      const prestamos = await this.prestamoRepository.findByEstadosYCobrador(estadoIds, userId);
      console.log('[SERVICE] findPendientes cobrador prestamos:', prestamos);
      return prestamos;
    }
  }
    async findByCobrador(cobradorId: number) {
      return this.prestamoRepository.findByCobrador(cobradorId);
    }
  constructor(
    @Inject('IPrestamoRepository')
    private readonly prestamoRepository: IPrestamoRepository,
    @Inject('IEstadoRepository')
    private readonly estadoRepository: IEstadoRepository,
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
    // Validar estado usando estadoId y el repositorio
    const estadosValidos = ['ACTIVO', 'CANCELADO', 'FINALIZADO'];
    const estado = await this.estadoRepository.findById(data.estadoId);
    if (!estado || !estadosValidos.includes(estado.nombre)) {
      // Validar tipoPrestamo
      if (!['FIJO', 'SOBRE_SALDO'].includes(data.tipoPrestamo)) {
        throw new Error('tipoPrestamo debe ser FIJO o SOBRE_SALDO');
      }
      // Convertir fechaInicio a Date
      const prestamo = await this.prestamoRepository.create({
        ...data,
        fechaInicio: new Date(data.fechaInicio),
        tipoPrestamo: data.tipoPrestamo,
      });
      return prestamo;
    }
    // Validar código único
    const prestamos = await this.prestamoRepository.findAll();
    if (prestamos.some(p => p.codigo === data.codigo)) {
      throw new (await import('@nestjs/common')).ConflictException('Ya existe un préstamo con ese código');
    }
    // Validar que el cliente no tenga un préstamo activo
    const tienePrestamoActivo = await Promise.all(
      prestamos
        .filter(p => p.clienteId === data.clienteId && p.estadoId)
        .map(async p => {
          const estado = await this.estadoRepository.findById(p.estadoId!);
          return estado?.nombre === 'ACTIVO';
        })
    ).then(results => results.some(Boolean));
    if (tienePrestamoActivo) {
      throw new (await import('@nestjs/common')).ConflictException('El cliente ya tiene un préstamo activo');
    }
    // Validar existencia de cliente y usuario (simulado, deberías consultar los repositorios reales)
    // Ejemplo: if (!(await clienteRepository.findById(data.clienteId))) throw new NotFoundException('Cliente no existe');
    // Ejemplo: if (!(await usuarioRepository.findById(data.usuarioId))) throw new NotFoundException('Usuario no existe');
    // usuarioId ya viene en data
    // Convertir fechaInicio a Date
    return this.prestamoRepository.create({
      ...data,
      fechaInicio: new Date(data.fechaInicio),
    });
  }

  async findAll() {
    return this.prestamoRepository.findAll();
  }

  async findById(id: number) {
    const prestamo = await this.prestamoRepository.findById(id);
    if (!prestamo) throw new NotFoundException('Préstamo no encontrado');
    return prestamo;
  }

  async update(id: number, data: import('./dto/update-prestamo.dto').UpdatePrestamoDto) {
    // Convertir fechaInicio a Date si viene como string
    const updateData: any = { ...data };
    if (updateData.fechaInicio && typeof updateData.fechaInicio === 'string') {
      updateData.fechaInicio = new Date(updateData.fechaInicio);
    }
    if (updateData.tipoPrestamo && !['FIJO', 'SOBRE_SALDO'].includes(updateData.tipoPrestamo as string)) {
      throw new Error('tipoPrestamo debe ser FIJO o SOBRE_SALDO');
    }
    return this.prestamoRepository.update(id, updateData);
  }

  async delete(id: number) {
    return this.prestamoRepository.delete(id);
  }

  async actualizarEstado(id: number, dto: UpdateEstadoPrestamoDto) {
  // Validar que el préstamo exista
  const prestamo = await this.prestamoRepository.findById(id);
  if (!prestamo) throw new NotFoundException('Préstamo no encontrado');
  // Validar que el estado exista usando el repositorio
  const estado = await this.estadoRepository.findById(dto.estadoId);
  if (!estado) throw new NotFoundException('Estado no encontrado');
  // Solo actualiza el campo estadoId
  // Usar UpdatePrestamoDto para actualizar solo estadoId
  const updateDto = { estadoId: dto.estadoId };
  return this.prestamoRepository.update(id, updateDto);
  }

  async findByClienteIdentificacion(identificacion: string) {
    return this.prestamoRepository.findByClienteIdentificacion(identificacion);
  }
}
