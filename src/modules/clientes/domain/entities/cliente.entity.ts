export class Cliente {
  constructor(
    public readonly id: number | null,
    public tipoIdentificacion: string,
    public identificacion: string,
    public nombres: string,
    public apellidos: string,
    public direccion: string,
    public telefono: string,
    public edad?: number,
  ) {}

  get nombreCompleto(): string {
    return `${this.nombres} ${this.apellidos}`;
  }
}
