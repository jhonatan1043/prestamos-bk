/**
 * CORS: si CORS_ORIGINS está definido (lista separada por comas), solo esos orígenes.
 * Si no, se mantiene el comportamiento anterior (cualquier origen) para no romper
 * despliegues existentes; conviene definirlo en producción.
 */
export function opcionesCors(env: Record<string, string | undefined>) {
  const lista = (env.CORS_ORIGINS ?? '').split(',').map(o => o.trim()).filter(Boolean);
  return {
    origin: lista.length ? lista : true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  };
}

/** Swagger solo fuera de producción, o en producción si SWAGGER_ENABLED=true. */
export function swaggerHabilitado(env: Record<string, string | undefined>): boolean {
  return env.NODE_ENV !== 'production' || env.SWAGGER_ENABLED === 'true';
}
