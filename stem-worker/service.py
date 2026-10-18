"""Private, single-consumer separation queue. Never expose this service publicly."""
import asyncio
import contextlib
import hmac
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import threading
import time
import uuid
from pathlib import Path

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import FileResponse

ROOT = Path(os.environ.get("STEM_DATA_DIR", "/data")).resolve()
ROOT.mkdir(parents=True, exist_ok=True)
SECRET = os.environ.get("STEM_WORKER_SECRET", "")
if len(SECRET) < 32:
    raise RuntimeError("STEM_WORKER_SECRET must contain at least 32 characters")
MAX_BYTES = 40 * 1024 * 1024
TTL = 86400
STOP = threading.Event()
ACTIVE = None
GATE = threading.Lock()


@contextlib.contextmanager
def db():
    conn = sqlite3.connect(ROOT / "queue.sqlite", timeout=15)
    conn.row_factory = sqlite3.Row
    try:
        with conn:
            yield conn
    finally:
        conn.close()


with db() as conn:
    conn.execute("CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, owner TEXT NOT NULL, tool TEXT NOT NULL, mode TEXT NOT NULL, status TEXT NOT NULL, created REAL NOT NULL, error TEXT)")
    conn.execute("CREATE INDEX IF NOT EXISTS jobs_owner ON jobs(owner, created)")
    # A killed inference is not silently replayed and charged twice.
    interrupted = conn.execute("SELECT id FROM jobs WHERE status IN ('running','uploading')").fetchall()
    conn.execute("UPDATE jobs SET status='error', error='interrupted' WHERE status IN ('running','uploading')")
    for row in interrupted:
        shutil.rmtree(ROOT / row["id"], ignore_errors=True)


def identity(request):
    if not hmac.compare_digest(request.headers.get("authorization", ""), "Bearer " + SECRET):
        raise HTTPException(403, "Forbidden")
    owner = request.headers.get("x-owner", "")
    if not re.fullmatch(r"[a-f0-9]{64}", owner):
        raise HTTPException(403, "Forbidden")
    return owner


def owned(job_id, owner):
    if not re.fullmatch(r"[a-f0-9]{32}", job_id):
        raise HTTPException(404)
    with db() as conn:
        row = conn.execute("SELECT * FROM jobs WHERE id=? AND owner=?", (job_id, owner)).fetchone()
    if not row or row["created"] < time.time() - TTL:
        raise HTTPException(404, "Expired or missing")
    return row


def public(row):
    names = ["vocals", "instrumental"] if row["tool"] == "vocal-remover" else ["vocals", "drums", "bass", "other"]
    return {k: row[k] for k in ("id", "tool", "mode", "status", "created", "error")} | {"stems": names}


def maintenance():
    cutoff = time.time() - TTL
    with db() as conn:
        expired = conn.execute("SELECT id FROM jobs WHERE created<? AND status NOT IN ('running','uploading')", (cutoff,)).fetchall()
        for row in expired:
            shutil.rmtree(ROOT / row["id"], ignore_errors=True)
        conn.execute("DELETE FROM jobs WHERE created<? AND status NOT IN ('running','uploading')", (cutoff,))
    # Quota receipts live separately from audio for a full UTC calendar day.


def consume():
    global ACTIVE
    while not STOP.wait(1):
        try:
            maintenance()
        except (OSError, sqlite3.Error):
            continue
        with db() as conn:
            conn.execute("BEGIN IMMEDIATE")
            row = conn.execute("SELECT * FROM jobs WHERE status='queued' ORDER BY created LIMIT 1").fetchone()
            if not row:
                continue
            conn.execute("UPDATE jobs SET status='running' WHERE id=?", (row["id"],))
        folder = ROOT / row["id"]
        try:
            # Model memory is released when this child exits, also between jobs.
            with open(folder / "worker.log", "wb") as log:
                ACTIVE = subprocess.Popen([sys.executable, str(Path(__file__).with_name("separate.py")), str(folder), row["mode"]], stdout=log, stderr=log)
                try:
                    code = ACTIVE.wait(timeout=1800)
                except subprocess.TimeoutExpired:
                    ACTIVE.kill(); ACTIVE.wait(); raise RuntimeError("timeout")
            if code or not (folder / "vocals.wav").is_file():
                raise RuntimeError("processing_failed")
            with db() as conn:
                conn.execute("UPDATE jobs SET status='done' WHERE id=?", (row["id"],))
        except Exception:
            for audio in folder.glob("*.wav"):
                audio.unlink(missing_ok=True)
            with db() as conn:
                conn.execute("UPDATE jobs SET status='error',error='processing_failed' WHERE id=?", (row["id"],))
        finally:
            ACTIVE = None
            (folder / "source").unlink(missing_ok=True)


@contextlib.asynccontextmanager
async def lifespan(app):
    thread = threading.Thread(target=consume, daemon=True); thread.start()
    yield
    STOP.set()
    if ACTIVE is not None:
        ACTIVE.kill()
    await asyncio.to_thread(thread.join, 10)


app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)


@app.get("/health")
def health(request: Request):
    identity(request)
    return {"status": "ok"}


@app.get("/jobs")
def listing(request: Request):
    owner = identity(request)
    with db() as conn:
        rows = conn.execute("SELECT * FROM jobs WHERE owner=? AND created>=? ORDER BY created DESC LIMIT 20", (owner, time.time()-TTL)).fetchall()
    return [public(row) for row in rows]


@app.post("/jobs", status_code=202)
async def submit(request: Request):
    owner = identity(request)
    # Bound actual incoming bytes BEFORE multipart parsing; no unbounded spooling.
    if not GATE.acquire(blocking=False):
        raise HTTPException(503, "Upload busy")
    job_id = uuid.uuid4().hex
    folder = ROOT / job_id
    try:
        size = 0
        chunks = []
        async with asyncio.timeout(120):
            async for chunk in request.stream():
                size += len(chunk)
                if size > MAX_BYTES + 1024 * 1024:
                    raise HTTPException(413, "Upload too large")
                chunks.append(chunk)
        async def receive():
            return {"type": "http.request", "body": b"".join(chunks), "more_body": False}
        bounded = Request(request.scope, receive)
        async with bounded.form(max_files=1, max_fields=2, max_part_size=MAX_BYTES) as form:
            tool, mode, file = form.get("tool"), form.get("mode"), form.get("file")
            if tool not in ("vocal-remover", "stem-separation") or mode not in ("preview", "full") or not hasattr(file, "read"):
                raise HTTPException(400, "Invalid request")
            with db() as conn:
                conn.execute("BEGIN IMMEDIATE")
                if conn.execute("SELECT COUNT(*) FROM jobs WHERE status IN ('uploading','queued','running')").fetchone()[0] >= 4:
                    raise HTTPException(503, "Queue full")
                if conn.execute("SELECT COUNT(*) FROM jobs WHERE owner=? AND status IN ('uploading','queued','running')", (owner,)).fetchone()[0]:
                    raise HTTPException(409, "A job is already active")
                day = int(time.time() // TTL) * TTL
                count = conn.execute("SELECT COUNT(*) FROM jobs WHERE owner=? AND mode=? AND created>=?", (owner, mode, day)).fetchone()[0]
                if count >= (3 if mode == "preview" else 2):
                    raise HTTPException(429, "Daily separation limit reached")
                if shutil.disk_usage(ROOT).free < 3 * 1024**3:
                    raise HTTPException(503, "Storage busy")
                conn.execute("INSERT INTO jobs VALUES (?,?,?,?,?,?,NULL)", (job_id, owner, tool, mode, "uploading", time.time()))
            folder.mkdir(mode=0o700)
            actual = 0
            with open(folder / "source", "xb") as target:
                while chunk := await file.read(1024 * 1024):
                    actual += len(chunk)
                    if actual > MAX_BYTES:
                        raise HTTPException(413, "Upload too large")
                    target.write(chunk)
            if not actual:
                raise HTTPException(400, "Empty file")
        with db() as conn:
            conn.execute("UPDATE jobs SET status='queued' WHERE id=?", (job_id,))
        return public(owned(job_id, owner))
    except BaseException:
        shutil.rmtree(folder, ignore_errors=True)
        with db() as conn:
            conn.execute("DELETE FROM jobs WHERE id=?", (job_id,))
        raise
    finally:
        GATE.release()


@app.get("/jobs/{job_id}")
def status(job_id: str, request: Request):
    return public(owned(job_id, identity(request)))


@app.get("/jobs/{job_id}/audio/{stem}")
def audio(job_id: str, stem: str, request: Request):
    row = owned(job_id, identity(request))
    if stem not in public(row)["stems"] or row["status"] != "done":
        raise HTTPException(404)
    return FileResponse(ROOT / job_id / f"{stem}.wav", media_type="audio/wav", headers={"Cache-Control": "private, no-store"})
