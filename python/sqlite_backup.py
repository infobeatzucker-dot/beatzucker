"""Create and verify a consistent SQLite snapshot, including committed WAL data."""
import os
import sqlite3
import sys
import tempfile
from contextlib import closing
from pathlib import Path


def snapshot(source, destination):
    source, destination = Path(source).resolve(), Path(destination).resolve()
    if source == destination or not source.is_file():
        raise ValueError("Backup source and destination must be different files.")
    with tempfile.NamedTemporaryFile(dir=destination.parent, prefix=".sqlite-backup-", delete=False) as handle:
        staging = Path(handle.name)
    try:
        with closing(sqlite3.connect(source.as_uri() + "?mode=ro", uri=True, timeout=15)) as current:
            with closing(sqlite3.connect(staging)) as backup:
                current.backup(backup)
                if backup.execute("PRAGMA quick_check").fetchall() != [("ok",)]:
                    raise RuntimeError("SQLite snapshot failed quick_check.")
        os.replace(staging, destination)
    finally:
        staging.unlink(missing_ok=True)


def user_count(path):
    with closing(sqlite3.connect(Path(path).resolve().as_uri() + "?mode=ro", uri=True)) as database:
        present = database.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='User'").fetchone()
        return database.execute('SELECT COUNT(*) FROM "User"').fetchone()[0] if present else 0


if __name__ == "__main__":
    if len(sys.argv) == 4 and sys.argv[1] == "snapshot":
        snapshot(sys.argv[2], sys.argv[3])
    elif len(sys.argv) == 3 and sys.argv[1] == "count":
        print(user_count(sys.argv[2]))
    else:
        raise SystemExit("Usage: sqlite_backup.py snapshot SOURCE DESTINATION | count DATABASE")
