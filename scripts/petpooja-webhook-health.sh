#!/usr/bin/env bash
# WP-P7 — validate PetPooja webhook base / callback URL health.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$ROOT/.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "$ROOT/.env"
  set +a
fi

CALLBACK_URL="${PETPOOJA_CALLBACK_URL:-}"
WEBHOOK_BASE_URL="${WEBHOOK_BASE_URL:-}"

if [[ -z "$WEBHOOK_BASE_URL" && -n "$CALLBACK_URL" ]]; then
  WEBHOOK_BASE_URL="${CALLBACK_URL%/callback}"
fi

if [[ -z "$WEBHOOK_BASE_URL" ]]; then
  echo "FAIL: set PETPOOJA_CALLBACK_URL or WEBHOOK_BASE_URL"
  exit 1
fi

echo "Webhook base: $WEBHOOK_BASE_URL"
echo "Callback:     ${CALLBACK_URL:-"(derived)/callback"}"

ephemeral=0
if echo "$WEBHOOK_BASE_URL" | grep -Eiq 'ngrok-free|ngrok\.io|loca\.lt|trycloudflare\.com'; then
  echo "WARN: URL looks ephemeral/tunnel-based — replace with durable host for cert/prod (WP-P7)"
  ephemeral=1
fi

if [[ "$WEBHOOK_BASE_URL" != https://* ]]; then
  echo "FAIL: webhook base must be https://"
  exit 1
fi

APP_KEY="${PETPOOJA_APP_KEY:-}"
APP_SECRET="${PETPOOJA_APP_SECRET:-}"
ACCESS_TOKEN="${PETPOOJA_ACCESS_TOKEN:-}"

if [[ -z "$APP_KEY" || -z "$APP_SECRET" || -z "$ACCESS_TOKEN" ]]; then
  echo "FAIL: set PETPOOJA_APP_KEY, PETPOOJA_APP_SECRET, PETPOOJA_ACCESS_TOKEN (loaded from .env)"
  exit 1
fi

CALLBACK="${CALLBACK_URL:-$WEBHOOK_BASE_URL/callback}"
echo
echo "POST probe: $CALLBACK"
HTTP_CODE=$(curl -sS -o /tmp/petpooja-webhook-health.body -w "%{http_code}" \
  -X POST "$CALLBACK" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: 1" \
  -H "app-key: $APP_KEY" \
  -H "app-secret: $APP_SECRET" \
  -H "access-token: $ACCESS_TOKEN" \
  -d '{"restID":"health-check","orderID":"order-webhook-health","status":"1"}' \
  || true)

echo "HTTP $HTTP_CODE"
if [[ -f /tmp/petpooja-webhook-health.body ]]; then
  head -c 400 /tmp/petpooja-webhook-health.body || true
  echo
fi

# Nest typically returns 200/201 even when order not found (avoid vendor retries).
if [[ "$HTTP_CODE" =~ ^2 ]]; then
  echo "PASS: callback endpoint reachable"
else
  echo "FAIL: expected 2xx from callback probe"
  exit 1
fi

if [[ "$ephemeral" -eq 1 ]]; then
  echo
  echo "RESULT: reachable but NOT durable — see docs/ops/durable-webhook-host.md"
  exit 2
fi

echo
echo "RESULT: OK — durable-looking HTTPS webhook host"
exit 0
