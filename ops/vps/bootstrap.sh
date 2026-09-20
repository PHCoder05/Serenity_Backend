#!/usr/bin/env bash
# Bootstrap Serenity API on a fresh Ubuntu VPS (Docker + Caddy TLS).
# Usage: sudo bash ops/vps/bootstrap.sh api.example.com
set -euo pipefail

HOSTNAME="${1:-}"
if [[ -z "$HOSTNAME" ]]; then
  echo "Usage: $0 <public-hostname>"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "FAIL: create $ROOT/.env first (copy .env.example and fill secrets)"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker…"
  curl -fsSL https://get.docker.com | sh
fi

PUBLIC_IP="$(curl -4 -sS --max-time 10 ifconfig.me || true)"
echo "Detected public IPv4: ${PUBLIC_IP:-unknown}"

# Point callback at durable host
if grep -q '^PETPOOJA_CALLBACK_URL=' .env; then
  sed -i "s|^PETPOOJA_CALLBACK_URL=.*|PETPOOJA_CALLBACK_URL=https://${HOSTNAME}/api/v1/petpooja/webhook/callback|" .env
else
  echo "PETPOOJA_CALLBACK_URL=https://${HOSTNAME}/api/v1/petpooja/webhook/callback" >> .env
fi

if [[ -n "$PUBLIC_IP" ]]; then
  if grep -q '^PETPOOJA_SHARED_IPV4=' .env; then
    sed -i "s|^PETPOOJA_SHARED_IPV4=.*|PETPOOJA_SHARED_IPV4=${PUBLIC_IP}|" .env
  else
    echo "PETPOOJA_SHARED_IPV4=${PUBLIC_IP}" >> .env
  fi
fi

# Ensure API talks to compose postgres
sed -i 's|^DATABASE_HOST=.*|DATABASE_HOST=postgres|' .env || true
grep -q '^DATABASE_HOST=' .env || echo 'DATABASE_HOST=postgres' >> .env
sed -i 's|^DATABASE_PORT=.*|DATABASE_PORT=5432|' .env || true

export SERENITY_HOSTNAME="$HOSTNAME"
# Bake hostname into Caddyfile for this host
sed "s/{\$SERENITY_HOSTNAME:localhost}/${HOSTNAME}/" ops/vps/Caddyfile > /tmp/serenity-Caddyfile
cp /tmp/serenity-Caddyfile ops/vps/Caddyfile.generated
cp ops/vps/Caddyfile.generated ops/vps/Caddyfile

echo "DNS: create A record ${HOSTNAME} → ${PUBLIC_IP:-<this-vps-ipv4>} before TLS will succeed."
echo "Starting stack…"
docker compose -f ops/vps/docker-compose.vps.yaml --env-file .env up -d --build

echo
echo "Webhook base: https://${HOSTNAME}/api/v1/petpooja/webhook"
echo "Callback:     https://${HOSTNAME}/api/v1/petpooja/webhook/callback"
echo "Share with PetPooja: IPv4 ${PUBLIC_IP:-?} + webhook base above"
echo "Verify: docker compose -f ops/vps/docker-compose.vps.yaml logs -f api"
