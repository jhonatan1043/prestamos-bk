export class Identificacion {
  private constructor(private readonly value: string) {}

  static create(value: string): Identificacion {
    if (!/^[0-9]{6,15}$/.test(value)) {
      throw new Error('Identificación inválida');
    }
    return new Identificacion(value);
  }

  getValue(): string {
    return this.value;
  }
}
