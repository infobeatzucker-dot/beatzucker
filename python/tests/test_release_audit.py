import os
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from release_check import check_release
from sqlite_backup import snapshot, user_count


class ReleaseAuditTests(unittest.TestCase):
    def test_release_check_reports_actual_flac_depth(self):
        ffmpeg = os.environ.get("FFMPEG_BINARY", "ffmpeg")
        with tempfile.TemporaryDirectory() as directory:
            for depth, sample_format in ((16, "s16"), (24, "s32")):
                with self.subTest(depth=depth):
                    audio = Path(directory) / f"mixcheck-qa-{depth}.flac"
                    subprocess.run(
                        [ffmpeg, "-v", "error", "-nostdin", "-f", "lavfi", "-i", "sine=f=440:r=48000:d=1",
                         "-sample_fmt", sample_format, "-bits_per_raw_sample", str(depth), str(audio)],
                        check=True, timeout=15,
                    )
                    report = check_release(audio)
                    self.assertEqual(report["bits"], depth)
                    self.assertEqual(report["container"], "flac")
                    self.assertEqual(report["sample_rate"], 48000)
                    self.assertIsNotNone(report["integrated_lufs"])

    def test_backup_restores_committed_rows_even_when_the_wal_is_open(self):
        with tempfile.TemporaryDirectory() as directory:
            original = Path(directory) / "original.db"
            backup = Path(directory) / "backup.db"
            restored = Path(directory) / "restored.db"
            with closing(sqlite3.connect(original)) as db:
                db.execute("PRAGMA journal_mode=WAL")
                db.execute("CREATE TABLE User (id TEXT NOT NULL)")
                db.execute("INSERT INTO User VALUES ('first')")
                db.commit()
                self.assertTrue(Path(str(original) + "-wal").exists())
                snapshot(original, backup)
                db.execute("INSERT INTO User VALUES ('second')")
                db.commit()
            snapshot(backup, restored)
            self.assertEqual(user_count(original), 2)
            self.assertEqual(user_count(restored), 1)
