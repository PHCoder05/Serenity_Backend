#!/usr/bin/env bash
# WP-P7 temporary bridge — keep reserved ngrok pointing at the local Serenity API.
# Port comes from APP_PORT / API_PORT (.env). Do not assume :3000 — another app
# may own that port (this lab: next-server on 3000, API on 3001).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$ROOT/.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "$ROOT/.env"
  set +a
fi

DOMAIN="${NGROK_RESERVED_DOMAIN:-forced-ailene-unfrankly.ngrok-free.dev}"
PORT="${APP_PORT:-${API_PORT:-3000}}"
LOG="${NGROK_BRIDGE_LOG:-/tmp/serenity-ngrok-bridge.log}"

if ! command -v ngrok >/dev/null 2>&1; then
  echo "FAIL: ngrok not found"
  exit 1
fi

if ! curl -sS --max-time 2 "http://127.0.0.1:${PORT}/api/v1/petpooja/webhook" >/dev/null 2>&1; then
  echo "WARN: Serenity webhook not healthy on :${PORT} — start API with APP_PORT=${PORT} first"
fi

if pgrep -f "ngrok http.*${DOMAIN}" >/dev/null 2>&1; then
  echo "OK: ngrok already running for ${DOMAIN}"
else
  echo "Starting ngrok → http://127.0.0.1:${PORT} as https://${DOMAIN}"
  nohup ngrok http --url="${DOMAIN}" "${PORT}" --log=stdout >>"${LOG}" 2>&1 &
  sleep 2
fi

echo "Webhook base: https://${DOMAIN}/api/v1/petpooja/webhook"
echo "Callback:     https://${DOMAIN}/api/v1/petpooja/webhook/callback"
echo "Log:          ${LOG}"
echo
exec npm run petpooja:webhook-health
