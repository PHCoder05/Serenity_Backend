#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

APP_PORT="${APP_PORT:-3000}"
API_PREFIX="${API_PREFIX:-api}"
REST_ID="${PETPOOJA_RESTAURANT_ID:-hbmp8vufrd}"

echo "PetPooja menu sync (fetch → Serenity DB)"
echo "========================================"

RESPONSE="$(curl -fsS -X POST "http://127.0.0.1:${APP_PORT}/${API_PREFIX}/v1/petpooja/outbound/menu/fetch" \
  -H "Content-Type: application/json" \
  -H "app-key: ${PETPOOJA_APP_KEY:?missing PETPOOJA_APP_KEY}" \
  -H "app-secret: ${PETPOOJA_APP_SECRET:?missing PETPOOJA_APP_SECRET}" \
  -H "access-token: ${PETPOOJA_ACCESS_TOKEN:?missing PETPOOJA_ACCESS_TOKEN}" \
  -d "{\"restID\":\"${REST_ID}\"}")"

ITEM_COUNT="$(python3 - <<'PY' "$RESPONSE"
import json, sys
data = json.loads(sys.argv[1])
items = data.get("items") or []
print(len(items))
PY
)"

echo "  ✓ Fetched menu from PetPooja (items in payload: ${ITEM_COUNT})"
echo "  ✓ Sync triggered via backend (check logs for 'Synced N menu items')"
