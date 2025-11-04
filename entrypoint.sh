#!/usr/bin/env bash
set -e

# ========================================================
# ✅ Normaliza variables POSTGRES_* desde DATABASE_URL (si faltan)
# ========================================================
if [ -z "$POSTGRES_HOST" ] || [ -z "$POSTGRES_PORT" ] || [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_DB" ]; then
  if [ -n "$DATABASE_URL" ]; then
    echo "Detectada DATABASE_URL, extrayendo valores..."
    hostport_and_rest="${DATABASE_URL##*@}"   # host:port/db
    hostport="${hostport_and_rest%%/*}"       # host:port
    POSTGRES_HOST="${POSTGRES_HOST:-${hostport%%:*}}"
    POSTGRES_PORT="${POSTGRES_PORT:-${hostport##*:}}"
    userpass_and_rest="${DATABASE_URL#*//}"   # user:pass@host
    userpass="${userpass_and_rest%%@*}"
    POSTGRES_USER="${POSTGRES_USER:-${userpass%%:*}}"
    POSTGRES_DB="${POSTGRES_DB:-${DATABASE_URL##*/}}"
  fi
fi

# ========================================================
# 🧩 Configuración base con valores por defecto
# - POSTGRES_PORT = puerto del servidor Postgres
# - PORT = puerto donde la APP escuchará (no lo sobrescribiremos)
# ========================================================
HOST=${POSTGRES_HOST:-postgres_db}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
USER=${POSTGRES_USER:-postgres}
DB=${POSTGRES_DB:-prestamos_db}

# App port: respeta la variable PORT si ya está definida, si no usa 3000
PORT=${PORT:-3000}

RETRIES=${DB_RETRY_COUNT:-60}
SLEEP=${DB_RETRY_SLEEP:-2}

echo "Esperando a que la base de datos esté disponible en ${HOST}:${POSTGRES_PORT} (usuario=${USER}, db=${DB})..."

# ========================================================
# ⏳ Espera a que la base de datos esté lista
# ========================================================
i=0
until PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$HOST" -p "$POSTGRES_PORT" -U "$USER" -d "$DB" -c '\q' >/dev/null 2>&1; do
  i=$((i+1))
  if [ "$i" -ge "$RETRIES" ]; then
    echo "❌ ERROR: No se pudo conectar a la base de datos después de $RETRIES intentos."
    echo "Revisa si el contenedor de Postgres (${HOST}) está corriendo y accesible."
    exit 1
  fi
  echo "-> intento $i/$RETRIES: Postgres no listo, esperando ${SLEEP}s..."
  sleep "$SLEEP"
done

echo "✅ Base de datos disponible."

# ========================================================
# 🧱 Prisma
# ========================================================
if command -v npx >/dev/null 2>&1; then
  echo "Ejecutando prisma generate..."
  npx prisma generate || echo "⚠️ Advertencia: 'prisma generate' falló, continuando..."

  echo "Aplicando migraciones (prisma migrate deploy)..."
  npx prisma migrate deploy || echo "⚠️ Advertencia: 'prisma migrate deploy' falló, continuando..."
else
  echo "⚠️ Aviso: npx no encontrado. Saltando pasos de Prisma."
fi

# ========================================================
# 🚀 Arranque de la aplicación
# - export PORT por si la app lee process.env.PORT
# ========================================================
export PORT
echo "Arrancando la aplicación Node en puerto ${PORT}..."
exec node dist/src/main.js
