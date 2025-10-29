#!/usr/bin/env bash
set -e

HOST=${POSTGRES_HOST:-db}
PORT=${POSTGRES_PORT:-5432}
RETRIES=30
SLEEP=2

i=0
until PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$HOST" -p "$PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; do
  i=$((i+1))
  if [ $i -ge $RETRIES ]; then exit 1; fi
  sleep $SLEEP
done

npx prisma generate
npx prisma migrate deploy

exec node dist/main.js
