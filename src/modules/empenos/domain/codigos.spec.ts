import { generarCodigoConsulta, siguienteCodigo } from './codigos';

describe('códigos', () => {
  it('secuenciales', () => {
    expect(siguienteCodigo(null)).toBe('EMP-000001');
    expect(siguienteCodigo('EMP-000123')).toBe('EMP-000124');
  });
  it('código de consulta de 6 caracteres sin ambiguos', () => {
    for (let i = 0; i < 50; i++) {
      expect(generarCodigoConsulta()).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    }
  });
});
