#!/bin/sh
set -eu

# Deliberately do NOT run the old start.sh: its db push would remove new columns.
# Extra nullable/defaulted columns remain in SQLite and are ignored by Prisma.
# Fail closed if the old client cannot read its schema or old inserts would fail.
node /app/rollback-tools/check-schema.cjs
exec /usr/bin/supervisord -n -c /etc/supervisor/conf.d/supervisord.conf
