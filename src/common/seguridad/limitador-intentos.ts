/** Cuenta fallos por clave (p. ej. IP + usuario) en una ventana de tiempo, en memoria. */
export class LimitadorIntentos {
  private readonly fallos = new Map<string, number[]>();

  constructor(private readonly maximo: number, private readonly ventanaMs: number) {}

  bloqueado(clave: string, ahora = Date.now()): boolean {
    return this.recientes(clave, ahora).length >= this.maximo;
  }

  registrarFallo(clave: string, ahora = Date.now()): void {
    this.fallos.set(clave, [...this.recientes(clave, ahora), ahora]);
  }

  limpiar(clave: string): void {
    this.fallos.delete(clave);
  }

  private recientes(clave: string, ahora: number): number[] {
    const vigentes = (this.fallos.get(clave) ?? []).filter(t => t > ahora - this.ventanaMs);
    if (vigentes.length) this.fallos.set(clave, vigentes);
    else this.fallos.delete(clave);
    return vigentes;
  }
}
