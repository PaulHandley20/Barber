#!/usr/bin/env bash
# Pruebas de la base de datos: crea una base vacía, aplica el esquema base
# de prueba, TODAS las migraciones en orden y corre supabase/tests/*.test.sql.
#
# Necesita un PostgreSQL 16 accesible con las variables estándar de psql
# (PGHOST, PGPORT, PGUSER, PGPASSWORD). Ejemplo local:
#   PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres npm run test:db
set -euo pipefail

cd "$(dirname "$0")/.."

DB="${TEST_DB_NAME:-barberos_test}"
PSQL=(psql -X -q -v ON_ERROR_STOP=1)

"${PSQL[@]}" -d postgres -c "drop database if exists ${DB}" -c "create database ${DB}" >/dev/null

run() {
  echo "  · $1"
  "${PSQL[@]}" -d "$DB" -f "$1" >/dev/null
}

echo "Esquema base"
for f in supabase/tests/fixtures/*.sql; do run "$f"; done

echo "Migraciones (cada una dos veces: tienen que poder volver a correrse)"
for f in supabase/migrations/*.sql; do run "$f"; run "$f"; done

echo "Pruebas"
for f in supabase/tests/*.test.sql; do run "$f"; done

echo "OK: todas las pruebas de base de datos pasaron."
