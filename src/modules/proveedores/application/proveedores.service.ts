import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/tenant/tenant-prisma.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';

@Injectable()
export class ProveedoresService {
  constructor(private readonly prisma: TenantPrismaService) {}

  async create(dto: CreateProveedorDto) {
    return this.prisma.proveedor.create({ data: dto });
  }

  async findAll() {
    return this.prisma.proveedor.findMany({
      where: { active: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number) {
    const p = await this.prisma.proveedor.findUnique({
      where: { id },
      include: { productos: { where: { active: true } } },
    });
    if (!p) throw new NotFoundException('Proveedor no encontrado');
    return p;
  }

  async update(id: number, dto: Partial<CreateProveedorDto>) {
    await this.findOne(id);
    return this.prisma.proveedor.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    const p = await this.findOne(id);
    const tiene = await this.prisma.producto.count({
      where: { proveedorId: id, active: true },
    });
    if (tiene > 0)
      throw new ConflictException('El proveedor tiene productos activos asociados');
    return this.prisma.proveedor.update({
      where: { id },
      data: { active: false },
    });
  }
}
