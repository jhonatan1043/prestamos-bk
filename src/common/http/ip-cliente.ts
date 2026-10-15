/**
 * IP del cliente. Detrás de nginx, req.ip es la del proxy; se usa el último valor
 * de X-Forwarded-For, que es el que añade nginx (los anteriores los puede enviar
 * el propio cliente).
 */
export function ipCliente(req: any): string {
  const xff = req.headers?.['x-forwarded-for'];
  const ultimo = typeof xff === 'string' ? xff.split(',').pop()?.trim() : undefined;
  return ultimo || req.ip || 'desconocida';
}
