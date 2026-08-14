#!/bin/sh
set -e

DB_PATH="/app/data/production.db"
DB_BACKUP="/app/data/production.db.bak"

# Backup existing DB before schema changes
if [ -f "$DB_PATH" ]; then
  cp "$DB_PATH" "$DB_BACKUP"
  echo "DB backed up before prisma db push"
fi

# Apply any pending schema changes
echo "Running Prisma db push..."
node node_modules/prisma/build/index.js db push --skip-generate 2>&1 || {
  echo "prisma db push failed — restoring backup"
  if [ -f "$DB_BACKUP" ]; then
    cp "$DB_BACKUP" "$DB_PATH"
    echo "Backup restored. Starting without schema changes."
  fi
}

# Verify DB has data — if User table is empty but backup has data, restore
if [ -f "$DB_BACKUP" ]; then
  CURRENT_SIZE=$(wc -c < "$DB_PATH" 2>/dev/null || echo 0)
  BACKUP_SIZE=$(wc -c < "$DB_BACKUP" 2>/dev/null || echo 0)
  # If current DB is significantly smaller than backup, data was likely lost
  if [ "$BACKUP_SIZE" -gt 0 ] && [ "$CURRENT_SIZE" -lt "$((BACKUP_SIZE / 2))" ]; then
    echo "WARNING: DB shrank from ${BACKUP_SIZE} to ${CURRENT_SIZE} bytes — restoring backup!"
    cp "$DB_BACKUP" "$DB_PATH"
    echo "Backup restored."
  fi
fi

echo "Prisma db push complete."

# Start all services via supervisord
exec /usr/bin/supervisord -n -c /etc/supervisor/conf.d/supervisord.conf
