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
    overrides: Optional[dict] = None            # manuell nachjustierte Parameter (Whitelist in ai_params)


class PreviewSegmentRequest(BaseModel):
    """Rendert NUR einen kurzen Ausschnitt durch die echte Mastering-Kette.

    Fuer die manuelle Nachjustierung: ein voller Track braucht Minuten, ein
    10-Sekunden-Ausschnitt wenige Sekunden — schnell genug, um beim Schrauben
    an den Reglern wirklich gegenzuhoeren, und im Gegensatz zur
    Web-Audio-Vorschau im Browser das exakte Endergebnis.
    """
    file_path: str
    start_sec: float = 0.0
    end_sec: float = 10.0
    platform: str = "spotify"
    preset: str = "auto"
    intensity: int = 65
    output_dir: str = "./uploads/masters"
    analysis: Optional[dict] = None
    reference_analysis: Optional[dict] = None
    overrides: Optional[dict] = None


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


@app.post("/preview_segment")
async def preview_segment(req: PreviewSegmentRequest):
    """Ausschnitt mit den aktuellen (ggf. manuell angepassten) Parametern mastern.

    Schneidet serverseitig auf den markierten Bereich zu und schickt nur den
    durch die vollstaendige Kette. Rueckgabe ist der master_id des gerenderten
    Ausschnitts, der ueber /api/download wie ein normales Master abrufbar ist.
    """
    src = validate_file_path(req.file_path)

    # Bereich begrenzen: mindestens 1 s, hoechstens 20 s. Ohne Obergrenze koennte
    # ein Client ueber diesen "schnellen" Pfad den ganzen Track rendern lassen und
    # damit die Warteschlange blockieren.
    start = max(0.0, float(req.start_sec))
    end = float(req.end_sec)
    if end - start < 1.0:
        end = start + 1.0
    if end - start > 20.0:
        end = start + 20.0

    loop = asyncio.get_event_loop()

    def _render() -> dict:
        import soundfile as _sf
        import numpy as _np
        import uuid as _uuid

        info = _sf.info(src)
        sr = info.samplerate
        begin_frame = int(start * sr)
        frames = int((end - start) * sr)
        if begin_frame >= info.frames:
            raise HTTPException(400, "Segment liegt hinter dem Trackende")
        frames = min(frames, info.frames - begin_frame)

        data, _ = _sf.read(src, start=begin_frame, frames=frames, always_2d=True)
        if data.shape[0] < sr:  # zu kurz zum sinnvollen Mastern
            raise HTTPException(400, "Segment zu kurz")

        os.makedirs(req.output_dir, exist_ok=True)
        seg_id = f"seg_{_uuid.uuid4().hex[:12]}"
        seg_path = os.path.join(req.output_dir, f"{seg_id}_src.wav")
        _sf.write(seg_path, data, sr, subtype="FLOAT")

        try:
            # Analyse des Ausschnitts: die uebergebene Track-Analyse passt nicht
            # (andere Lautheit/Dynamik als der Gesamttrack), also frisch messen.
            seg_analysis = analysis_to_dict(analyze_audio(seg_path))
            params = get_mastering_params(
                seg_analysis, req.platform, req.preset, req.intensity,
                reference_analysis=req.reference_analysis,
                overrides=req.overrides,
            )
            result = master_audio(
                seg_path, params, req.output_dir,
                selected_format="mp3128", pre_analysis=seg_analysis, master_id=seg_id,
            )
            return {
                "master_id": result.master_id,
                "post_analysis": result.post_analysis,
                "start_sec": start,
                "end_sec": end,
            }
        finally:
            try:
                os.remove(seg_path)
            except OSError:
                pass

    try:
        out = await loop.run_in_executor(None, _render)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error in /preview_segment")
        raise HTTPException(500, "Preview failed")

    # NaN/Inf entfernen, damit die JSON-Serialisierung nicht scheitert
    import math
    post = out.get("post_analysis")
    if isinstance(post, dict):
        out["post_analysis"] = {
            k: (0.0 if isinstance(v, float) and (math.isnan(v) or math.isinf(v)) else v)
            for k, v in post.items()
        }
    return out


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
                    overrides=req.overrides,
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
            # The heartbeat re-sends the *last real* step/progress rather than a
            # guessed higher number — a fabricated "97% rendering" would visibly
            # jump backward once the actual next stage (e.g. "ms" at 52%) arrives.
            last_step, last_progress = "eq", 18
            while not mastering_task.done():
                try:
                    step, progress = await asyncio.wait_for(progress_queue.get(), timeout=2.0)
                    if step != "complete":
                        last_step, last_progress = step, progress
                        yield encode({"step": step, "progress": progress, "label": STEP_LABELS.get(step, step)})
                except asyncio.TimeoutError:
                    yield encode({"step": last_step, "progress": last_progress, "label": STEP_LABELS.get(last_step, last_step)})

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

            # Die tatsaechlich verwendeten Parameter mitschicken: die manuelle
            # Nachjustierung im Browser muss ihre Regler mit genau den Werten
            # starten, mit denen dieser Master entstanden ist — sonst springt
            # der Klang beim ersten Reglerkontakt unerwartet.
            from dataclasses import asdict as _asdict
            yield encode({
                "step": "complete",
                "progress": 100,
                "master_id": result.master_id,
                "formats": formats,
                "post_analysis": post,
                "notes": result.notes,
                "params": _asdict(params),
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
