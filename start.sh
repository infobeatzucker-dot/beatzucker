#!/bin/sh
set -e

DB_PATH="/app/data/production.db"
DB_BACKUP="/app/data/production.db.bak"
BASELINE_USERS=0
HAS_SNAPSHOT=0

restore_snapshot() {
  # Services have not started. Remove stale journals from the failed database
  # before replacing it with a self-contained, verified snapshot.
  rm -f "$DB_PATH-wal" "$DB_PATH-shm" "$DB_PATH-journal"
  python /app/python/sqlite_backup.py snapshot "$DB_BACKUP" "$DB_PATH"
}

# Backup existing DB before schema changes
if [ -f "$DB_PATH" ]; then
  python /app/python/sqlite_backup.py snapshot "$DB_PATH" "$DB_BACKUP"
  BASELINE_USERS=$(python /app/python/sqlite_backup.py count "$DB_BACKUP")
  HAS_SNAPSHOT=1
  echo "DB backed up before prisma db push"
fi

# Apply any pending schema changes
echo "Running Prisma db push..."
node node_modules/prisma/build/index.js db push --skip-generate 2>&1 || {
  echo "prisma db push failed — restoring backup"
  if [ "$HAS_SNAPSHOT" = 1 ]; then
    restore_snapshot
    echo "Backup restored. Startup aborted to prevent a code/schema mismatch."
  fi
  exit 1
}

# Validate actual account rows rather than comparing SQLite file sizes.
if [ "$HAS_SNAPSHOT" = 1 ]; then
  if ! CURRENT_USERS=$(python /app/python/sqlite_backup.py count "$DB_PATH") || [ "$CURRENT_USERS" -ne "$BASELINE_USERS" ]; then
    echo "Account count check failed — restoring snapshot."
    restore_snapshot
    echo "Backup restored."
    exit 1
  fi
fi

echo "Prisma db push complete."

# Start all services via supervisord
exec /usr/bin/supervisord -n -c /etc/supervisor/conf.d/supervisord.conf
