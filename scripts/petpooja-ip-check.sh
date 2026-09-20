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
NGROK_API_URL="${NGROK_API_URL:-http://127.0.0.1:4040/api/tunnels}"
DEVELOPER_PORTAL_URL="${DEVELOPER_PORTAL_URL:-https://developerapi.petpooja.com/}"
PETPOOJA_FETCH_MENU_URL="${PETPOOJA_FETCH_MENU_URL:-https://qle1yy2ydc.execute-api.ap-southeast-1.amazonaws.com/V1/mapped_restaurant_menus}"
PETPOOJA_RESTAURANT_ID="${PETPOOJA_RESTAURANT_ID:-}"

pass() { printf '  ✓ %s\n' "$1"; }
fail() { printf '  ✗ %s\n' "$1"; FAILURES=$((FAILURES + 1)); }
warn() { printf '  ! %s\n' "$1"; }

FAILURES=0

echo "PetPooja staging IP & connectivity check"
echo "========================================"

IPV4_IFCONFIG="$(curl -4 -fsS --max-time 10 ifconfig.me 2>/dev/null || true)"
IPV4_IPIFY="$(curl -4 -fsS --max-time 10 https://api.ipify.org 2>/dev/null || true)"
IPV4_ICANHAZ="$(curl -4 -fsS --max-time 10 https://icanhazip.com 2>/dev/null | tr -d '\n' || true)"
IPV6="$(curl -6 -fsS --max-time 10 ifconfig.me 2>/dev/null || true)"

# Prefer a single shareable IPv4; prefer agreement across sources.
IPV4="${IPV4_IPIFY:-${IPV4_IFCONFIG:-${IPV4_ICANHAZ:-}}}"
if [[ -n "$IPV4_IPIFY" && -n "$IPV4_IFCONFIG" && "$IPV4_IPIFY" != "$IPV4_IFCONFIG" ]]; then
  IPV4="$IPV4_IPIFY"
fi

echo
echo "Public IP (share with PetPooja)"
echo "  IPv4 (primary share): ${IPV4:-unavailable}"
echo "  IPv4 ipify:           ${IPV4_IPIFY:-unavailable}"
echo "  IPv4 ifconfig.me:     ${IPV4_IFCONFIG:-unavailable}"
echo "  IPv4 icanhazip:       ${IPV4_ICANHAZ:-unavailable}"
echo "  IPv6:                 ${IPV6:-unavailable}"
if [[ -n "$IPV4_IPIFY" && -n "$IPV4_IFCONFIG" && "$IPV4_IPIFY" != "$IPV4_IFCONFIG" ]]; then
  warn "Egress looks dual-path/rotating — ask PetPooja to whitelist BOTH IPv4s until static egress (docs/ops/static-egress-cutover.md)"
fi

echo
echo "Connectivity"
if [[ -n "$IPV4" ]]; then
  pass "Public IPv4 detected"
else
  fail "Could not detect public IPv4"
fi

if curl -fsS --max-time 15 -o /dev/null "$DEVELOPER_PORTAL_URL"; then
  pass "Developer portal reachable ($DEVELOPER_PORTAL_URL)"
else
  fail "Developer portal unreachable ($DEVELOPER_PORTAL_URL)"
fi

if [[ -n "${PETPOOJA_APP_KEY:-}" && -n "${PETPOOJA_APP_SECRET:-}" && -n "${PETPOOJA_ACCESS_TOKEN:-}" && -n "$PETPOOJA_RESTAURANT_ID" ]]; then
  MENU_TMP="$(mktemp)"
  MENU_HTTP="$(curl -sS --max-time 45 -o "$MENU_TMP" -w "%{http_code}" -X POST "$PETPOOJA_FETCH_MENU_URL" \
    -H "Content-Type: application/json" \
    -d "{\"app_key\":\"$PETPOOJA_APP_KEY\",\"app_secret\":\"$PETPOOJA_APP_SECRET\",\"access_token\":\"$PETPOOJA_ACCESS_TOKEN\",\"restID\":\"$PETPOOJA_RESTAURANT_ID\"}" 2>/dev/null || echo "000")"
  MENU_RESPONSE="$(cat "$MENU_TMP" 2>/dev/null || true)"
  rm -f "$MENU_TMP"
  if [[ "$MENU_RESPONSE" == *'"success":"1"'* || "$MENU_RESPONSE" == *'"success": "1"'* ]]; then
    pass "Staging menu API accepts credentials (restID=$PETPOOJA_RESTAURANT_ID, HTTP $MENU_HTTP)"
  elif [[ -z "$MENU_RESPONSE" || "$MENU_HTTP" == "000" ]]; then
    fail "Staging menu API unreachable (HTTP $MENU_HTTP — timeout/network, not a clear whitelist reject)"
  else
    fail "Staging menu API rejected credentials or restID (HTTP $MENU_HTTP)"
    warn "Response: ${MENU_RESPONSE:0:200}"
  fi

  SAVE_TMP="$(mktemp)"
  SAVE_HTTP="$(curl -sS --max-time 45 -o "$SAVE_TMP" -w "%{http_code}" -X POST "${PETPOOJA_SAVE_ORDER_URL:-https://qle1yy2ydc.execute-api.ap-southeast-1.amazonaws.com/V1/save_order}" \
    -H "Content-Type: application/json" \
    -d "{\"app_key\":\"$PETPOOJA_APP_KEY\",\"app_secret\":\"$PETPOOJA_APP_SECRET\",\"access_token\":\"$PETPOOJA_ACCESS_TOKEN\",\"restID\":\"$PETPOOJA_RESTAURANT_ID\",\"orderinfo\":{\"OrderInfo\":{\"Order\":{\"details\":{\"orderID\":\"ip-check-$(date +%s)\",\"preorder_date\":\"2026-06-30\",\"preorder_time\":\"12:00:00\",\"advanced_order\":\"N\",\"order_type\":\"H\",\"payment_type\":\"ONLINE\",\"total\":\"198.45\",\"tax_total\":\"9.45\",\"discount_total\":\"0\",\"service_charge\":\"0\",\"sc_tax_amount\":\"0\",\"delivery_charges\":\"0\",\"dc_tax_percentage\":\"0\",\"dc_tax_amount\":\"0\",\"pc_tax_percentage\":\"0\",\"pc_tax_amount\":\"0\",\"enable_delivery\":1,\"created_on\":\"2026-06-30 12:00:00\",\"callback_url\":\"${PETPOOJA_CALLBACK_URL:-}\",\"device_type\":\"Web\"}},\"Customer\":{\"details\":{\"name\":\"IP Check\",\"phone\":\"9876543210\",\"address\":\"Mumbai\"}},\"OrderItem\":{\"details\":[{\"id\":\"5079\",\"name\":\"Veg Mocha\",\"tax_inclusive\":false,\"gst_liability\":\"restaurant\",\"item_tax\":[{\"id\":\"3661\",\"name\":\"CGST\",\"tax_percentage\":\"2.5\",\"amount\":\"4.73\"},{\"id\":\"3662\",\"name\":\"SGST\",\"tax_percentage\":\"2.5\",\"amount\":\"4.72\"}],\"item_discount\":\"\",\"price\":\"189.00\",\"final_price\":\"189.00\",\"quantity\":\"1\",\"variation_name\":\"\",\"variation_id\":\"\",\"addon_items\":[]}]},\"Tax\":{\"details\":[{\"id\":\"3661\",\"title\":\"CGST\",\"type\":\"P\",\"price\":\"2.5\",\"tax\":\"4.73\",\"restaurant_liable_amt\":\"4.73\"},{\"id\":\"3662\",\"title\":\"SGST\",\"type\":\"P\",\"price\":\"2.5\",\"tax\":\"4.72\",\"restaurant_liable_amt\":\"4.72\"}]}}}}" 2>/dev/null || echo "000")"
  SAVE_RESPONSE="$(cat "$SAVE_TMP" 2>/dev/null || true)"
  rm -f "$SAVE_TMP"
  if [[ "$SAVE_RESPONSE" == *'"success":"1"'* || "$SAVE_RESPONSE" == *'"success": "1"'* ]]; then
    if [[ "$SAVE_RESPONSE" == *'"orderID":""'* || "$SAVE_RESPONSE" == *'"orderID": ""'* ]]; then
      warn "save_order accepts payload but orderID is empty (PetPooja-side relay issue, HTTP $SAVE_HTTP)"
    else
      pass "save_order returned a PetPooja orderID (HTTP $SAVE_HTTP)"
    fi
  elif [[ -z "$SAVE_RESPONSE" || "$SAVE_HTTP" == "000" ]]; then
    fail "save_order unreachable (HTTP $SAVE_HTTP — timeout/network)"
  else
    fail "save_order rejected payload (HTTP $SAVE_HTTP)"
    warn "Response: ${SAVE_RESPONSE:0:200}"
  fi

  EXPECTED_IPV4="${PETPOOJA_SHARED_IPV4:-}"
  if [[ -n "$EXPECTED_IPV4" && "$IPV4" == "$EXPECTED_IPV4" ]]; then
    pass "Public IPv4 matches PETPOOJA_SHARED_IPV4 ($IPV4)"
  elif [[ -n "$EXPECTED_IPV4" ]]; then
    warn "Public IPv4 $IPV4 differs from PETPOOJA_SHARED_IPV4=$EXPECTED_IPV4 — update PetPooja whitelist"
  else
    warn "Home ISP IPv4 is $IPV4 (rotating). Set PETPOOJA_SHARED_IPV4 when you share a stable IP with PetPooja."
  fi
else
  warn "Skipping menu API check (set PETPOOJA_* vars in .env)"
fi

if curl -fsS --max-time 5 -o /dev/null "http://127.0.0.1:${APP_PORT}/" 2>/dev/null; then
  pass "Local backend responding on port ${APP_PORT}"
else
  warn "Local backend not responding on port ${APP_PORT} (start with: npm run start:dev)"
fi

PUBLIC_URL=""
if TUNNELS_JSON="$(curl -fsS --max-time 3 "$NGROK_API_URL" 2>/dev/null || true)"; then
  PUBLIC_URL="$(python3 - <<'PY' "$TUNNELS_JSON"
import json, sys
raw = sys.argv[1] if len(sys.argv) > 1 else ""
if not raw:
    raise SystemExit
data = json.loads(raw)
for tunnel in data.get("tunnels", []):
    url = tunnel.get("public_url", "")
    if url.startswith("https://"):
        print(url)
        break
PY
)"
fi

echo
echo "Webhook base (paste into PetPooja Configuration → Base URL)"
if [[ -n "$PUBLIC_URL" ]]; then
  WEBHOOK_BASE="${PUBLIC_URL}/${API_PREFIX}/v1/petpooja/webhook"
  pass "ngrok tunnel: $PUBLIC_URL"
  echo "  Base URL:              $WEBHOOK_BASE"
  echo "  (PetPooja appends suffixes; we accept both hyphen and underscore forms)"
  echo "  Menu Sharing:          pushmenu | push-menu | pushmenu_endpoint"
  echo "  Get Store Status:      get_store_status | get-store-status"
  echo "  Update Store Status:   update_store_status | update-store-status"
  echo "  Item On:               item_stock | item-stock"
  echo "  Item Off:              item_stock_off | item-stock-off"
  echo "  Order callback:        callback  (also sent per-order as callback_url)"
else
  warn "ngrok not running — start with: ngrok http ${APP_PORT}"
  echo "  Then re-run: npm run petpooja:ip-check"
fi

echo
echo "Copy for PetPooja email"
echo "-----------------------"
cat <<EOF
Public IPv4: ${IPV4:-N/A}
Public IPv6: ${IPV6:-N/A}
Mapping code (restID): ${PETPOOJA_RESTAURANT_ID:-hbmp8vufrd}
Webhook Base URL: ${PUBLIC_URL:+${PUBLIC_URL}/${API_PREFIX}/v1/petpooja/webhook}
EOF

echo
if [[ "$FAILURES" -gt 0 ]]; then
  echo "Result: $FAILURES check(s) failed"
  exit 1
fi

echo "Result: all checks passed"
