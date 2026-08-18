"""
FastAPI Python Microservice for Beatzucker
Handles audio analysis and mastering processing.
"""

import os
import json
import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import soundfile as sf
import librosa

from analyzer import analyze_audio, analysis_to_dict
from ai_params import get_mastering_params
from mastering import master_audio


# ─── Cleanup job on startup ────────────────────────────────────────────────────

def cleanup_old_files(upload_dir: str, max_age_hours: int = 24):
    """Remove temp files older than max_age_hours."""
    import time
    now = time.time()
    upload_path = Path(upload_dir)
    if not upload_path.exists():
        return
    for f in upload_path.iterdir():
        if f.is_file() and (now - f.stat().st_mtime) > max_age_hours * 3600:
            try:
                f.unlink()
            except Exception:
                pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    upload_dir = os.environ.get("TEMP_UPLOAD_DIR", "./uploads")
    cleanup_old_files(upload_dir)
    yield


# ─── Logging ──────────────────────────────────────────────────────────────────

logger = logging.getLogger("beatzucker")

# ─── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Beatzucker – Python Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000,https://beatzucker.de,https://www.beatzucker.de").split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


# ─── Models ────────────────────────────────────────────────────────────────────

class FilePathRequest(BaseModel):
    file_path: str


class AnalyzeRequest(BaseModel):
    file_path: str


class MasterRequest(BaseModel):
    file_path: str
    platform: str = "spotify"
    preset: str = "auto"
    intensity: int = 65
    format: str = "mp3128"
    output_dir: str = "./uploads/masters"
    master_id: Optional[str] = None             # DB record ID — used as output filename prefix
    analysis: Optional[dict] = None             # pre-computed analysis — skips librosa re-run
    reference_analysis: Optional[dict] = None   # optional reference track analysis for reference mastering


# ─── Path validation ───────────────────────────────────────────────────────────

ALLOWED_UPLOAD_DIR = os.path.abspath(os.environ.get("TEMP_UPLOAD_DIR", "./uploads"))

def validate_file_path(file_path: str) -> str:
    """Resolve and validate that the path is within the allowed upload directory."""
    resolved = os.path.abspath(file_path)
    if not resolved.startswith(ALLOWED_UPLOAD_DIR):
        raise HTTPException(403, "Path outside allowed directory")
    if not os.path.exists(resolved):
        raise HTTPException(404, "File not found")
    return resolved


# ─── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "Beatzucker Python"}


@app.post("/info")
async def get_info(req: FilePathRequest):
    """Get basic file info (duration, sample rate, etc.)."""
    try:
        req.file_path = validate_file_path(req.file_path)

        info = sf.info(req.file_path)
        return {
            "duration": info.duration,
            "sample_rate": info.samplerate,
            "channels": info.channels,
            "format": info.format,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error in /info")
        raise HTTPException(500, "Internal server error")


@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    """Full audio analysis."""
    try:
        req.file_path = validate_file_path(req.file_path)

        analysis = analyze_audio(req.file_path)
        return analysis_to_dict(analysis)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error in /analyze")
        raise HTTPException(500, "Analysis failed")


@app.post("/master")
async def master(req: MasterRequest):
    """Full mastering chain with SSE progress streaming."""
    req.file_path = validate_file_path(req.file_path)

    # Real progress labels, keyed by the step names master_audio() actually emits
    # (see the emit() calls throughout mastering.py's master_audio()).
    STEP_LABELS = {
        "analyzing":   "Analyzing track…",
        "loading":     "Loading track…",
        "eq":          "Applying EQ correction…",
        "compression": "Multiband compression…",
        "ms":          "M/S processing…",
        "saturation":  "Harmonic saturation…",
        "limiting":    "True Peak limiting…",
        "rendering":   f"Rendering {req.format.upper()}…",
        "complete":    "Finalizing master…",
    }

    async def generate():
        def encode(data: dict) -> str:
            return f"data: {json.dumps(data)}\n\n"

        try:
            yield encode({"step": "analyzing", "progress": 5, "label": "Analyzing track…"})

            loop = asyncio.get_event_loop()

            if req.analysis:
                # Pre-analysis passed from frontend — skip expensive librosa re-run
                analysis_dict = req.analysis
            else:
                # No pre-analysis — run full analysis (30–90s)
                analysis_obj = await loop.run_in_executor(
                    None, analyze_audio, req.file_path
                )
                analysis_dict = analysis_to_dict(analysis_obj)

            yield encode({"step": "eq", "progress": 18, "label": "Getting mastering parameters…"})

            # Rule-based mastering params — pure in-process computation, no external API.
            params = await loop.run_in_executor(
                None,
                lambda: get_mastering_params(
                    analysis_dict, req.platform, req.preset, req.intensity,
                    reference_analysis=req.reference_analysis,
                )
            )

            # Bridge master_audio()'s synchronous progress_callback (runs in a worker
            # thread) into this async generator via a thread-safe queue, so the SSE
            # stream reflects the actual DSP stage instead of a fixed sleep timer.
            progress_queue: asyncio.Queue = asyncio.Queue()

            def progress_cb(step: str, progress: int):
                loop.call_soon_threadsafe(progress_queue.put_nowait, (step, progress))

            mastering_task = loop.run_in_executor(
                None, master_audio, req.file_path, params, req.output_dir, progress_cb, req.format, analysis_dict, req.master_id
            )

            # Drain real progress events as they arrive; fall back to a heartbeat
            # (no new event yet) so the connection stays alive on slow stages.
            # master_audio()'s own internal "complete" event carries no payload
            # (no master_id/formats) — skip it, the real final event below does.
            while not mastering_task.done():
                try:
                    step, progress = await asyncio.wait_for(progress_queue.get(), timeout=2.0)
                    if step != "complete":
                        yield encode({"step": step, "progress": progress, "label": STEP_LABELS.get(step, step)})
                except asyncio.TimeoutError:
                    yield encode({"step": "rendering", "progress": 97, "label": "Finalizing master…"})

            # Drain any events queued right before completion
            while not progress_queue.empty():
                step, progress = progress_queue.get_nowait()
                if step != "complete":
                    yield encode({"step": step, "progress": progress, "label": STEP_LABELS.get(step, step)})

            result = await mastering_task

            # Build download URLs
            base_url = "/api/download"
            formats = {}
            for fmt, path in result.paths.items():
                if path and os.path.exists(path):
                    ext = path.split(".")[-1]
                    formats[fmt] = f"{base_url}?master_id={result.master_id}&format={fmt}"

            # Sanitize post_analysis before JSON encoding (NaN/Inf → safe defaults)
            post = result.post_analysis
            if isinstance(post, dict):
                import math
                post = {
                    k: (0.0 if isinstance(v, float) and (math.isnan(v) or math.isinf(v)) else v)
                    for k, v in post.items()
                }

            yield encode({
                "step": "complete",
                "progress": 100,
                "master_id": result.master_id,
                "formats": formats,
                "post_analysis": post,
                "notes": result.notes,
                "genre": params.genre,
            })

        except Exception as e:
            logger.exception("Error in /master")
            yield encode({"step": "error", "progress": 0, "error": "Mastering failed"})

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
