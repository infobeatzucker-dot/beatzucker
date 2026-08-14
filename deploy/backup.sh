#!/bin/bash
# Daily SQLite DB backup — keeps last 14 days, alerts by email on failure.
#
# Runs via crontab on the production host (not inside the container):
#   0 3 * * * /bin/bash /opt/upmado/backup.sh >> /opt/upmado/backups/backup.log 2>&1
#
# A missing/empty DB is treated as a hard failure (not silently skipped) —
# this is what let a previous DB loss go unnoticed for weeks.

set -uo pipefail

APP_DIR="/opt/upmado"
BACKUP_DIR="$APP_DIR/backups"
DB_PATH="$APP_DIR/data/production.db"
DATE=$(date +%Y-%m-%d)
LOG="$BACKUP_DIR/backup.log"

mkdir -p "$BACKUP_DIR"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"
}

# Load RESEND_API_KEY / ADMIN_EMAIL / EMAIL_FROM for alerting, if present
if [ -f "$APP_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$APP_DIR/.env"
  set +a
fi

alert() {
  local subject="$1" body="$2"
  log "ALERT: $subject — $body"
  if [ -n "${RESEND_API_KEY:-}" ] && [ -n "${ADMIN_EMAIL:-}" ]; then
    curl -s -X POST "https://api.resend.com/emails" \
      -H "Authorization: Bearer $RESEND_API_KEY" \
      -H "Content-Type: application/json" \
      -d "$(printf '{"from":"%s","to":"%s","subject":"%s","text":"%s"}' \
            "${EMAIL_FROM:-noreply@upmado.com}" "$ADMIN_EMAIL" "$subject" "$body")" \
      > /dev/null || log "WARNING: alert email failed to send"
  fi
}

if [ ! -f "$DB_PATH" ]; then
  log "ERROR: production.db not found at $DB_PATH — backup skipped"
  alert "UpMaDo Backup FAILED" "production.db was not found at $DB_PATH on $(hostname) at $(date). No backup was created. Investigate immediately — this may mean the database was lost."
  exit 1
fi

DEST="$BACKUP_DIR/production_${DATE}.db"

if cp "$DB_PATH" "$DEST" 2>>"$LOG" && [ -s "$DEST" ]; then
  chmod 600 "$DEST"
  SIZE=$(wc -c < "$DEST")
  log "OK: backup saved to $DEST ($SIZE bytes)"
else
  log "ERROR: cp failed or produced an empty file at $DEST"
  alert "UpMaDo Backup FAILED" "Copying $DB_PATH to $DEST failed or produced an empty file on $(hostname) at $(date)."
  rm -f "$DEST"
  exit 1
fi

# Cleanup: remove backups older than 14 days
find "$BACKUP_DIR" -name "production_*.db" -mtime +14 -delete

log "Cleanup done (kept last 14 days)."
