import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/tenant/tenant-prisma.service';
import { CreateProductoDto, CreateCategoriaDto } from './dto/create-producto.dto';

@Injectable()
export class ProductosService {
  constructor(private readonly prisma: TenantPrismaService) {}

  // ── Categorías ────────────────────────────────────────────────────────────

  async createCategoria(dto: CreateCategoriaDto) {
    const existe = await this.prisma.categoriaProducto.findUnique({
      where: { nombre: dto.nombre },
    });
    if (existe) throw new ConflictException('Ya existe una categoría con ese nombre');
    return this.prisma.categoriaProducto.create({ data: dto });
  }

  async findAllCategorias() {
    return this.prisma.categoriaProducto.findMany({
      where: { active: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async removeCategoria(id: number) {
    const tiene = await this.prisma.producto.count({
      where: { categoriaId: id, active: true },
    });
    if (tiene > 0)
      throw new ConflictException('La categoría tiene productos activos');
    return this.prisma.categoriaProducto.update({
      where: { id },
      data: { active: false },
    });
  }

  // ── Productos ─────────────────────────────────────────────────────────────

  async create(dto: CreateProductoDto) {
    const existe = await this.prisma.producto.findUnique({
      where: { codigo: dto.codigo },
    });
    if (existe) throw new ConflictException('Ya existe un producto con ese código');

    return this.prisma.producto.create({
      data: {
        codigo:       dto.codigo,
        nombre:       dto.nombre,
        descripcion:  dto.descripcion ?? null,
        precioCompra: dto.precioCompra,
        precioVenta:  dto.precioVenta,
        stock:        dto.stock,
        stockMinimo:  dto.stockMinimo ?? 0,
        categoriaId:  dto.categoriaId ?? null,
        proveedorId:  dto.proveedorId ?? null,
      },
      include: { categoria: true, proveedor: true },
    });
  }

  async findAll() {
    return this.prisma.producto.findMany({
      where: { active: true },
      include: { categoria: true, proveedor: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number) {
    const p = await this.prisma.producto.findUnique({
      where: { id },
      include: { categoria: true, proveedor: true },
    });
    if (!p) throw new NotFoundException('Producto no encontrado');
    return p;
  }

  async update(id: number, dto: Partial<CreateProductoDto>) {
    await this.findOne(id);
    if (dto.codigo) {
      const existe = await this.prisma.producto.findUnique({
        where: { codigo: dto.codigo },
      });
      if (existe && existe.id !== id)
        throw new ConflictException('Ya existe otro producto con ese código');
    }
    return this.prisma.producto.update({
      where: { id },
      data: dto,
      include: { categoria: true, proveedor: true },
    });
  }

  async ajustarStock(id: number, cantidad: number, tipo: 'ENTRADA' | 'SALIDA') {
    const producto = await this.findOne(id);
    const nuevoStock = tipo === 'ENTRADA'
      ? producto.stock + cantidad
      : producto.stock - cantidad;

    if (nuevoStock < 0)
      throw new BadRequestException('Stock insuficiente');

    return this.prisma.producto.update({
      where: { id },
      data: { stock: nuevoStock },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.producto.update({
      where: { id },
      data: { active: false },
    });
  }
}
