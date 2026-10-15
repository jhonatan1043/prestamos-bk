import { ipCliente } from './empenos-portal.controller';

describe('ipCliente', () => {
  it('detrás de nginx usa el último valor de X-Forwarded-For (el que añade el proxy)', () => {
    expect(ipCliente({ headers: { 'x-forwarded-for': '1.1.1.1, 9.9.9.9' }, ip: '10.0.0.2' })).toBe('9.9.9.9');
  });

  it('sin proxy usa req.ip', () => {
    expect(ipCliente({ headers: {}, ip: '10.0.0.5' })).toBe('10.0.0.5');
  });
});
