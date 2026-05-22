import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import type { IPrestamoRepository } from '../domain/repositories/prestamo.repository';
import type { IEstadoRepository } from '../../estados/domain/repositories/estado.repository';
import { AuditLogService, AuditAction } from '../../../common/audit/audit-log.service';
import { LimitesService } from '../../suscripciones/application/limites.service';
import { UpdateEstadoPrestamoDto } from './dto/update-estado-prestamo.dto';
import { CreatePrestamoDto } from './dto/create-prestamo.dto';
import { UpdatePrestamoDto } from './dto/update-prestamo.dto';

const ESTADOS_VALIDOS = ['ACTIVO', 'CANCELADO', 'FINALIZADO'];
const TIPOS_PRESTAMO  = ['FIJO', 'SOBRE_SALDO'];

@Injectable()
export class PrestamosService {
  constructor(
    @Inject('IPrestamoRepository')
    private readonly prestamoRepository: IPrestamoRepository,
    @Inject('IEstadoRepository')
    private readonly estadoRepository: IEstadoRepository,
    private readonly auditLogService: AuditLogService,
    private readonly limitesService: LimitesService,
  ) {}

  async create(data: CreatePrestamoDto, userId: number) {
    await this.limitesService.verificarPrestamos(data.clienteId);

    if (data.tasa < 0 || data.tasa > 100)
      throw new BadRequestException('La tasa debe estar entre 0% y 100%');

    if (data.plazoDias <= 0 || data.plazoDias > 365)
      throw new BadRequestException('El plazo debe estar entre 1 y 365');

    if (!TIPOS_PRESTAMO.includes(data.tipoPrestamo))
      throw new BadRequestException('tipoPrestamo debe ser FIJO o SOBRE_SALDO');

    const estado = await this.estadoRepository.findById(data.estadoId);
    if (!estado || !ESTADOS_VALIDOS.includes(estado.nombre))
      throw new BadRequestException(
        `Estado inválido. Permitidos: ${ESTADOS_VALIDOS.join(', ')}`,
      );

    const prestamos = await this.prestamoRepository.findAll();
    const tienePrestamoActivo = await Promise.all(
      prestamos
        .filter(p => p.clienteId === data.clienteId && p.estadoId)
        .map(async p => {
          const est = await this.estadoRepository.findById(p.estadoId!);
          return est?.nombre === 'ACTIVO';
        }),
    ).then(r => r.some(Boolean));

    if (tienePrestamoActivo)
      throw new ConflictException('El cliente ya tiene un préstamo activo');

    const prestamo = await this.prestamoRepository.create({
      ...data,
      fechaInicio: new Date(data.fechaInicio),
    });

    await this.auditLogService.log(
      userId,
      AuditAction.PRESTAMO_CREAR,
      'Prestamo',
      prestamo.id,
      `Préstamo ${prestamo.codigo} creado — cliente #${data.clienteId} — monto $${data.monto}`,
    );

    return prestamo;
  }

  async findAll() {
    return this.prestamoRepository.findAll();
  }

  async findById(id: number) {
    const prestamo = await this.prestamoRepository.findById(id);
    if (!prestamo) throw new NotFoundException('Préstamo no encontrado');
    return prestamo;
  }

  async findPendientes(userId: number, isAdmin: boolean) {
    const estadoIds = [1, 4];
    if (isAdmin) return this.prestamoRepository.findByEstados(estadoIds);
    return this.prestamoRepository.findByEstadosYCobrador(estadoIds, userId);
  }

  async findByCobrador(cobradorId: number) {
    return this.prestamoRepository.findByCobrador(cobradorId);
  }

  async findByClienteIdentificacion(identificacion: string) {
    return this.prestamoRepository.findByClienteIdentificacion(identificacion);
  }

  async update(id: number, data: UpdatePrestamoDto, userId: number) {
    const prestamo = await this.prestamoRepository.findById(id);
    if (!prestamo) throw new NotFoundException('Préstamo no encontrado');

    if (data.tipoPrestamo && !TIPOS_PRESTAMO.includes(data.tipoPrestamo))
      throw new BadRequestException('tipoPrestamo debe ser FIJO o SOBRE_SALDO');

    const updateData: any = { ...data };
    if (typeof updateData.fechaInicio === 'string')
      updateData.fechaInicio = new Date(updateData.fechaInicio);

    const updated = await this.prestamoRepository.update(id, updateData);

    await this.auditLogService.log(
      userId,
      AuditAction.PRESTAMO_ACTUALIZAR,
      'Prestamo',
      id,
      `Préstamo #${id} actualizado — campos: ${Object.keys(data).join(', ')}`,
    );

    return updated;
  }

  async delete(id: number, userId: number) {
    const prestamo = await this.prestamoRepository.findById(id);
    if (!prestamo) throw new NotFoundException('Préstamo no encontrado');

    await this.prestamoRepository.delete(id);

    await this.auditLogService.log(
      userId,
      AuditAction.PRESTAMO_ELIMINAR,
      'Prestamo',
      id,
      `Préstamo #${id} (${prestamo.codigo}) eliminado`,
    );
  }

  async actualizarEstado(id: number, dto: UpdateEstadoPrestamoDto, userId: number) {
    const prestamo = await this.prestamoRepository.findById(id);
    if (!prestamo) throw new NotFoundException('Préstamo no encontrado');

    const estado = await this.estadoRepository.findById(dto.estadoId);
    if (!estado) throw new NotFoundException('Estado no encontrado');

    const updated = await this.prestamoRepository.update(id, { estadoId: dto.estadoId });

    await this.auditLogService.log(
      userId,
      AuditAction.PRESTAMO_ESTADO,
      'Prestamo',
      id,
      `Préstamo #${id} estado cambiado a "${estado.nombre}"`,
    );

    return updated;
  }
}
