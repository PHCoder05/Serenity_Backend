#!/usr/bin/env bash
# Daily Postgres dump. Keeps 14 days in ops/vps/backups.
# Copy that directory off the machine. A file on the same disk is not a second copy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${BACKUP_DIR:-$ROOT/ops/vps/backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$OUT/serenity-$STAMP.dump"
PARTIAL="$FILE.partial"
COMPOSE=(docker compose -f "$ROOT/ops/vps/docker-compose.vps.yaml" --env-file "$ROOT/.env")
trap 'rm -f "$PARTIAL"' EXIT

if [[ ! -f "$ROOT/.env" ]]; then
  echo "FAIL: missing $ROOT/.env" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$ROOT/.env"
set +a

: "${DATABASE_USERNAME:?DATABASE_USERNAME is required}"
: "${DATABASE_NAME:?DATABASE_NAME is required}"

mkdir -p "$OUT"

if "${COMPOSE[@]}" ps --status running --services 2>/dev/null | grep -qx postgres; then
  "${COMPOSE[@]}" exec -T postgres \
    pg_dump -U "$DATABASE_USERNAME" -d "$DATABASE_NAME" -Fc >"$PARTIAL"
else
  : "${DATABASE_HOST:?DATABASE_HOST is required when compose postgres is not running}"
  : "${DATABASE_PORT:?DATABASE_PORT is required when compose postgres is not running}"
  # The Postgres image's client matches the server. Ubuntu's pg_dump is often older.
  if command -v docker >/dev/null 2>&1; then
    docker run --rm --network host \
      -e "PGPASSWORD=${DATABASE_PASSWORD:-}" \
      postgres:17.9-alpine \
      pg_dump \
      -h "$DATABASE_HOST" \
      -p "$DATABASE_PORT" \
      -U "$DATABASE_USERNAME" \
      -d "$DATABASE_NAME" \
      -Fc >"$PARTIAL"
  else
    export PGPASSWORD="${DATABASE_PASSWORD:-}"
    pg_dump \
      -h "$DATABASE_HOST" \
      -p "$DATABASE_PORT" \
      -U "$DATABASE_USERNAME" \
      -d "$DATABASE_NAME" \
      -Fc >"$PARTIAL"
    unset PGPASSWORD
  fi
fi

if [[ ! -s "$PARTIAL" ]]; then
  echo "FAIL: empty dump" >&2
  exit 1
fi

mv "$PARTIAL" "$FILE"
trap - EXIT

find "$OUT" -name 'serenity-*.dump' -type f -mtime +"$KEEP_DAYS" -delete
echo "Wrote $FILE"
