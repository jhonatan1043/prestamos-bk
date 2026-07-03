export class Producto {
  constructor(
    public id: number | null,
    public codigo: string,
    public nombre: string,
    public descripcion: string | null,
    public precioCompra: number,
    public precioVenta: number,
    public stock: number,
    public stockMinimo: number,
    public categoriaId: number | null,
    public proveedorId: number | null,
    public active: boolean = true,
  ) {}
}

export class CategoriaProducto {
  constructor(
    public id: number | null,
    public nombre: string,
    public active: boolean = true,
  ) {}
}
