#!/usr/bin/env bash
set -e

HOST=${POSTGRES_HOST:-postgres_db}
PORT=${POSTGRES_PORT:-5432}
USER=${POSTGRES_USER:-postgres}
DB=${POSTGRES_DB:-prestamos_db}
RETRIES=${DB_RETRY_COUNT:-60}
SLEEP=${DB_RETRY_SLEEP:-2}

echo "Esperando a que la base de datos esté disponible en ${HOST}:${PORT} (usuario=${USER}, db=${DB})..."

i=0
until PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" -c '\q' >/dev/null 2>&1; do
  i=$((i+1))
  if [ "$i" -ge "$RETRIES" ]; then
    echo "ERROR: No se pudo conectar a la base de datos después de $RETRIES intentos."
    exit 1
  fi
  echo "-> intento $i/$RETRIES: Postgres no listo, esperando ${SLEEP}s..."
  sleep "$SLEEP"
done

echo "Base de datos ok. Ejecutando prisma generate..."
if command -v npx >/dev/null 2>&1; then
  npx prisma generate
else
  echo "Aviso: npx no encontrado. Se omite 'prisma generate'."
fi

echo "Intentando aplicar migraciones (prisma migrate deploy) si está disponible..."
if command -v npx >/dev/null 2>&1; then
  if ! npx prisma migrate deploy; then
    echo "Advertencia: 'prisma migrate deploy' devolvió error (se continúa)."
  fi
else
  echo "Aviso: npx no encontrado. Skipping migrations (ejecuta migraciones desde CI o contenedor temporal)."
fi

echo "Arrancando la aplicación..."
exec node dist/main.js
