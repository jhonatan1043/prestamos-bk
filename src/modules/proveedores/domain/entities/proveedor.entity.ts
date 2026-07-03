export class Proveedor {
  constructor(
    public id: number | null,
    public nombre: string,
    public contacto: string | null,
    public telefono: string | null,
    public email: string | null,
    public direccion: string | null,
    public notas: string | null,
    public active: boolean = true,
  ) {}
}
