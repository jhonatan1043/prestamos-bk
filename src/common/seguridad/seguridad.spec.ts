import { LimitadorIntentos } from './limitador-intentos';
import { opcionesCors, swaggerHabilitado } from './configuracion';

describe('configuración de seguridad', () => {
  it('CORS usa la lista de CORS_ORIGINS', () => {
    expect(opcionesCors({ CORS_ORIGINS: 'https://admin.ejemplo.com, https://app.ejemplo.com' }).origin)
      .toEqual(['https://admin.ejemplo.com', 'https://app.ejemplo.com']);
  });

  it('sin CORS_ORIGINS mantiene el comportamiento anterior', () => {
    expect(opcionesCors({}).origin).toBe(true);
  });

  it('Swagger apagado en producción salvo que se active explícitamente', () => {
    expect(swaggerHabilitado({ NODE_ENV: 'production' })).toBe(false);
    expect(swaggerHabilitado({ NODE_ENV: 'production', SWAGGER_ENABLED: 'true' })).toBe(true);
    expect(swaggerHabilitado({ NODE_ENV: 'development' })).toBe(true);
  });
});

describe('LimitadorIntentos', () => {
  it('bloquea tras el máximo de fallos y un acierto limpia la clave', () => {
    const l = new LimitadorIntentos(3, 60_000);
    for (let i = 0; i < 3; i++) l.registrarFallo('a');
    expect(l.bloqueado('a')).toBe(true);
    expect(l.bloqueado('b')).toBe(false);
    l.limpiar('a');
    expect(l.bloqueado('a')).toBe(false);
  });

  it('los fallos caducan con la ventana', () => {
    const l = new LimitadorIntentos(1, 1_000);
    const ahora = Date.now();
    l.registrarFallo('a', ahora - 5_000);
    expect(l.bloqueado('a', ahora)).toBe(false);
  });
});
