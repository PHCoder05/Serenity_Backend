#!/usr/bin/env bash
# Probe /api/v1/health. Alert once when it goes down, and once when it returns.
# Set ALERT_WEBHOOK_URL to a Slack-compatible incoming webhook. Cron mail is the fallback.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
URL="${HEALTH_URL:-http://127.0.0.1:${APP_PORT:-3001}/api/v1/health}"
STATE_DIR="${STATE_DIR:-$ROOT/ops/vps/state}"
STATE_FILE="$STATE_DIR/api-health"

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
  URL="${HEALTH_URL:-http://127.0.0.1:${APP_PORT:-3001}/api/v1/health}"
fi

mkdir -p "$STATE_DIR"
PREV="$(cat "$STATE_FILE" 2>/dev/null || echo unknown)"

if curl -fsS --max-time 5 "$URL" >/dev/null; then
  NOW=ok
else
  NOW=down
fi
echo "$NOW" >"$STATE_FILE"

alert() {
  local text="$1"
  echo "$text" >&2
  if [[ -n "${ALERT_WEBHOOK_URL:-}" ]]; then
    curl -fsS --max-time 10 -X POST "$ALERT_WEBHOOK_URL" \
      -H 'content-type: application/json' \
      -d "{\"text\":\"${text}\"}" >/dev/null || echo "WARN: alert webhook failed" >&2
  fi
}

if [[ "$NOW" == down && "$PREV" != down ]]; then
  alert "Serenity API is down ($URL)"
  exit 1
fi

if [[ "$NOW" == ok && "$PREV" == down ]]; then
  alert "Serenity API recovered ($URL)"
fi
