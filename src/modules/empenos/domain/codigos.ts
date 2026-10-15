import { randomInt } from 'crypto';

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** EMP-000001, EMP-000002, … a partir del último código del esquema. */
export function siguienteCodigo(ultimo: string | null): string {
  const n = ultimo ? Number(/EMP-(\d+)/.exec(ultimo)?.[1] ?? 0) : 0;
  return `EMP-${String(n + 1).padStart(6, '0')}`;
}

/** Código que el cliente usa para consultar sus empeños (sin caracteres ambiguos). */
export function generarCodigoConsulta(): string {
  return Array.from({ length: 6 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
}
