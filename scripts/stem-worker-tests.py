"""Run with the isolated stem venv; never connects to a production service."""
import importlib.util
import os
import tempfile
import time
import unittest
from pathlib import Path

if os.environ.get("BEATZUCKER_ISOLATED_QA") != "1":
    raise RuntimeError("Requires isolated QA flag")
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "validation-output" / "stem-integration"
OUT.mkdir(parents=True, exist_ok=True)
TEMP = tempfile.TemporaryDirectory(prefix="worker-", dir=OUT)
os.environ["STEM_DATA_DIR"] = TEMP.name
os.environ["STEM_WORKER_SECRET"] = "isolated-qa-not-for-production-123456789"
spec = importlib.util.spec_from_file_location("stem_service", ROOT / "stem-worker" / "service.py")
service = importlib.util.module_from_spec(spec)
spec.loader.exec_module(service)
from fastapi.testclient import TestClient
client = TestClient(service.app)
HEADERS = {"Authorization": "Bearer " + service.SECRET, "X-Owner": "a" * 64}


def submit(mode="preview", tool="vocal-remover"):
    return client.post("/jobs", headers=HEADERS, data={"mode": mode, "tool": tool}, files={"file": ("track.wav", b"invalid audio")})


class WorkerTests(unittest.TestCase):
    def setUp(self):
        with service.db() as conn:
            conn.execute("DELETE FROM jobs")

    def test_private_owner(self):
        self.assertEqual(client.get("/jobs").status_code, 403)
        response = submit(); self.assertEqual(response.status_code, 202, response.text)
        job = response.json()["id"]
        self.assertEqual(client.get(f"/jobs/{job}", headers={**HEADERS, "X-Owner": "b"*64}).status_code, 404)
        self.assertEqual(client.get(f"/jobs/{job}/audio/../../queue.sqlite", headers=HEADERS).status_code, 404)
        self.assertEqual(client.get(f"/jobs/{job}/audio/vocals", headers=HEADERS).status_code, 404)

    def test_queue_and_daily_quota(self):
        for index in range(3):
            response = submit(); self.assertEqual(response.status_code, 202, response.text)
            if index == 0:
                self.assertEqual(submit().status_code, 409)
            with service.db() as conn:
                conn.execute("UPDATE jobs SET status='error'")
        self.assertEqual(submit().status_code, 429)

    def test_expiry(self):
        response = submit(); job = response.json()["id"]
        with service.db() as conn:
            conn.execute("UPDATE jobs SET status='done',created=?", (time.time()-90000,))
        self.assertEqual(client.get(f"/jobs/{job}", headers=HEADERS).status_code, 404)
        service.maintenance()
        self.assertFalse((service.ROOT / job).exists())

    def test_invalid_fields_and_size(self):
        self.assertEqual(submit(mode="admin").status_code, 400)
        self.assertEqual(client.post("/jobs", headers=HEADERS, data={"tool":"vocal-remover", "mode":"preview"}, files={"file":("track.wav",b"x"*(42*1024*1024))}).status_code, 413)

    def test_restart_preserves_queue_and_refuses_interrupted_job(self):
        response = submit(); running = response.json()["id"]
        with service.db() as conn:
            conn.execute("UPDATE jobs SET status='running'")
            conn.execute("INSERT INTO jobs VALUES(?,?,?,?,?,?,NULL)", ("e"*32, "b"*64, "vocal-remover", "preview", "queued", time.time()))
        restart_spec = importlib.util.spec_from_file_location("stem_restart", ROOT / "stem-worker/service.py")
        restarted = importlib.util.module_from_spec(restart_spec); restart_spec.loader.exec_module(restarted)
        with restarted.db() as conn:
            self.assertEqual(conn.execute("SELECT status FROM jobs WHERE id=?", (running,)).fetchone()[0], "error")
            self.assertEqual(conn.execute("SELECT status FROM jobs WHERE id=?", ("e"*32,)).fetchone()[0], "queued")
        self.assertFalse((service.ROOT / running).exists())

    def test_global_queue_limit(self):
        for index in range(4):
            headers = {**HEADERS, "X-Owner": str(index)*64}
            response = client.post("/jobs", headers=headers, data={"tool":"vocal-remover", "mode":"preview"}, files={"file":("track.wav",b"fixture")})
            self.assertEqual(response.status_code, 202, response.text)
        self.assertEqual(submit().status_code, 503)


if __name__ == "__main__":
    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(WorkerTests))
    TEMP.cleanup()
    raise SystemExit(0 if result.wasSuccessful() else 1)
