#!/usr/bin/env bash
# Print the launch cron, or install it with --install.
# Backup at 02:15 UTC. Health probe every minute.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MARKER="# serenity-ops"
BACKUP="15 2 * * * $ROOT/ops/vps/backup-postgres.sh >> $ROOT/ops/vps/state/backup.log 2>&1 $MARKER"
WATCH="* * * * * $ROOT/ops/vps/watch-api.sh >> $ROOT/ops/vps/state/watch.log 2>&1 $MARKER"

mkdir -p "$ROOT/ops/vps/state"

if [[ "${1:-}" != "--install" ]]; then
  echo "$BACKUP"
  echo "$WATCH"
  echo "Install with: bash ops/vps/install-ops-cron.sh --install"
  exit 0
fi

CURRENT="$(crontab -l 2>/dev/null | grep -v "$MARKER" || true)"
printf '%s\n%s\n%s\n' "$CURRENT" "$BACKUP" "$WATCH" | crontab -
echo "Installed Serenity backup and health cron for $ROOT"
