import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/tenant/tenant-prisma.service';
import type { IClienteRepository } from '../domain/repositories/cliente.repository';
import { CreateClienteDto } from '../presentation/dto/create-cliente.dto';
import { UpdateClienteDto } from '../presentation/dto/update-cliente.dto';
import { Cliente } from '../domain/entities/cliente.entity';
import { AuditLogService, AuditAction } from '../../../common/audit/audit-log.service';
import { LimitesService } from '../../suscripciones/application/limites.service';

@Injectable()
export class ClientesService {
  constructor(
    @Inject('IClienteRepository')
    private readonly clienteRepository: IClienteRepository,
    private readonly prisma: TenantPrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly limitesService: LimitesService,
  ) {}

  async create(dto: CreateClienteDto, userId: number) {
    await this.limitesService.verificarClientes();

    const clientes = await this.clienteRepository.findAll();
    const existe = clientes.find(c => c.identificacion === dto.identificacion);

    if (existe) {
      if (existe.active === false) {
        // Reactivar cliente inactivo
        existe.tipoIdentificacion = dto.tipoIdentificacion;
        existe.nombres            = dto.nombres;
        existe.apellidos          = dto.apellidos;
        existe.direccion          = dto.direccion;
        existe.telefono           = dto.telefono;
        existe.fechaNacimiento    = dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : undefined;
        existe.active             = true;
        const reactivado = await this.clienteRepository.update(existe);
        await this.auditLogService.log(
          userId, AuditAction.CLIENTE_CREAR, 'Cliente', reactivado.id!,
          `Cliente #${reactivado.id} (${dto.identificacion}) reactivado`,
        );
        return reactivado;
      }
      throw new ConflictException('El cliente ya está registrado');
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
      dto.correo,
      dto.usuarioId,
      dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : undefined,
    );

    const creado = await this.clienteRepository.create(cliente);
    await this.auditLogService.log(
      userId, AuditAction.CLIENTE_CREAR, 'Cliente', creado.id!,
      `Cliente #${creado.id} (${dto.identificacion}) creado`,
    );
    return creado;
  }

  async findAll() {
    return this.clienteRepository.findAll();
  }

  async findOne(id: number) {
    const cliente = await this.clienteRepository.findById(id);
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    return cliente;
  }

  async findDisponibles() {
    const clientes = await this.clienteRepository.findAll();

    // estadoId 1 = ACTIVO, 4 = MORA — ambos bloquean al cliente para nuevo préstamo
    const prestamosActivos = await this.prisma.prestamo.findMany({
      where: { estadoId: { in: [1, 4] } },
    });
    const clientesConPrestamoActivo = new Set(prestamosActivos.map(p => p.clienteId));
    const clientesDisponibles = clientes.filter(c => c.id !== null && !clientesConPrestamoActivo.has(c.id!));

    const rutaIds = clientesDisponibles.map(c => c.sectorId);
    const rutas   = await this.prisma.ruta.findMany({ where: { id: { in: rutaIds } } });
    const rutasMap = new Map(rutas.map(r => [r.id, r]));

    return clientesDisponibles.map(c => {
      const ruta = rutasMap.get(c.sectorId);
      return {
        id: c.id,
        usuarioId: c.usuarioId ?? 0,
        tipoIdentificacion: c.tipoIdentificacion,
        identificacion: c.identificacion,
        nombres: c.nombres,
        apellidos: c.apellidos,
        direccion: c.direccion,
        telefono: c.telefono,
        fechaNacimiento: c.fechaNacimiento,
        sectorId: c.sectorId,
        cobradorId: ruta?.cobradorId ?? null,
        correo: c.correo,
        sector: ruta?.sector ?? null,
      };
    });
  }

  async findByCobrador(cobradorId: number) {
    return this.clienteRepository.findByCobrador(cobradorId);
  }

  async buscarPorIdentificacion(identificacion: string) {
    const clientes = await this.clienteRepository.findAll();
    const cliente = clientes.find(c => c.identificacion === identificacion);
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    return cliente;
  }

  async update(id: number, dto: UpdateClienteDto, userId: number) {
    if (dto.identificacion) {
      const clientes = await this.clienteRepository.findAll();
      const existe = clientes.find(c => c.identificacion === dto.identificacion && c.id !== id);
      if (existe) throw new ConflictException('Ya existe otro cliente con esa identificación');
    }

    const clienteActual = await this.clienteRepository.findById(id);
    if (!clienteActual) throw new NotFoundException('Cliente no encontrado');

    const cliente = new Cliente(
      id,
      dto.tipoIdentificacion          ?? clienteActual.tipoIdentificacion,
      dto.identificacion              ?? clienteActual.identificacion,
      dto.nombres                     ?? clienteActual.nombres,
      dto.apellidos                   ?? clienteActual.apellidos,
      dto.direccion                   ?? clienteActual.direccion,
      dto.telefono                    ?? clienteActual.telefono,
      dto.sectorId                    ?? clienteActual.sectorId,
      dto.correo                      ?? clienteActual.correo,
      clienteActual.usuarioId,
      dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : clienteActual.fechaNacimiento,
    );

    const actualizado = await this.clienteRepository.update(cliente);
    await this.auditLogService.log(
      userId, AuditAction.CLIENTE_ACTUALIZAR, 'Cliente', id,
      `Cliente #${id} actualizado — campos: ${Object.keys(dto).join(', ')}`,
    );
    return actualizado;
  }

  async remove(id: number, userId: number) {
    const cliente = await this.clienteRepository.findById(id);
    if (!cliente) throw new NotFoundException('Cliente no encontrado');

    await this.clienteRepository.remove(id);
    await this.auditLogService.log(
      userId, AuditAction.CLIENTE_ELIMINAR, 'Cliente', id,
      `Cliente #${id} (${cliente.identificacion}) desactivado`,
    );
  }
}
