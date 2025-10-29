import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateCobradorDto } from './dto/create-cobrador.dto';

@Injectable()
export class CobradorService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCobradorDto) {
    const usuario = await this.prisma.user.findUnique({ where: { id: dto.usuarioId } });
    if (!usuario) throw new ConflictException('Usuario no encontrado');
    if (usuario.role === 'ADMIN') throw new ConflictException('No se puede asignar administrador como cobrador');
    const existe = await this.prisma.cobrador.findUnique({ where: { usuarioId: dto.usuarioId } });
    if (existe) throw new ConflictException('Ya es cobrador');
    return this.prisma.cobrador.create({ data: dto });
  }

  async findAll() {
    return this.prisma.cobrador.findMany({ include: { usuario: true, rutas: true } });
  }
}
