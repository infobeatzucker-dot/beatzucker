"""
FastAPI Python Microservice for Beatzucker
Handles audio analysis and mastering processing.
"""

import os
import json
import asyncio
import logging
import re
import hmac
import subprocess
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import soundfile as sf
import librosa

from analyzer import analyze_audio, analysis_to_dict
from ai_params import get_mastering_params
from mastering import master_audio
from waveform import extract_waveform_peaks
from dsp_lease import DspLease
from dsp_admission import acquire_budget
from silence_normalizer import normalize_section
from codec_preview import render_codec, meter_audio
from speech_cleaner import clean_speech
from audio_limits import validate_full_dsp_audio
from control_preview import render_control
from preview_section import read_preview_section
from showcase_prepare import prepare_showcase


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
    if os.environ.get("NODE_ENV") == "production" and len(os.environ.get("PYTHON_SERVICE_SECRET", "")) < 32:
        raise RuntimeError("PYTHON_SERVICE_SECRET must contain at least 32 characters in production")
    # Next.js owns retention using DB completion times and active-worker state.
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

SERVICE_SECRET = os.environ.get("PYTHON_SERVICE_SECRET", "")
PROTECTED_PATHS = {"/speech-clean", "/info", "/analyze", "/waveform", "/master", "/jobs", "/trim-normalize", "/codec-preview", "/meter", "/control-preview", "/preview-section", "/showcase-prepare"}
# Full-track DSP temporarily allocates several arrays per stage. The small
# production host must not run two such allocations on top of each other.
# Larger installations can still explicitly opt into a higher capacity.
MAX_CONCURRENT_DSP_JOBS = max(1, int(os.environ.get("MAX_CONCURRENT_DSP_JOBS", "1")))
DSP_SLOTS = asyncio.Semaphore(MAX_CONCURRENT_DSP_JOBS)
ACTIVE_MASTER_IDS = set()


@app.middleware("http")
async def authenticate_internal_service(request: Request, call_next):
    """Protect CPU-intensive DSP endpoints from direct external invocation."""
    if request.url.path in PROTECTED_PATHS and SERVICE_SECRET:
        supplied = request.headers.get("X-Beatzucker-Service-Token", "")
        if not supplied or not hmac.compare_digest(supplied, SERVICE_SECRET):
            return JSONResponse({"detail": "Unauthorized service request"}, status_code=401)
    return await call_next(request)


async def acquire_dsp_slot(master=False):
    try:
        return await acquire_budget(DSP_SLOTS, MAX_CONCURRENT_DSP_JOBS, master=master,
                                    timeout=min(30, max(.1, float(os.environ.get("MASTER_QUEUE_WAIT_SECONDS", "15")))) if master else .1,
                                    max_waiting=max(1, min(16, int(os.environ.get("MAX_WAITING_MASTER_JOBS", "4")))))
    except asyncio.TimeoutError:
        raise HTTPException(503, "DSP service is busy", headers={"Retry-After": "15"})


# ─── Models ────────────────────────────────────────────────────────────────────

class FilePathRequest(BaseModel):
    file_path: str


class AnalyzeRequest(BaseModel):
    file_path: str


class TrimNormalizeRequest(BaseModel):
    file_path: str
    start: float
    end: float
    target: float


class SpeechCleanRequest(BaseModel):
    file_path: str
    strength: str = "gentle"
    low_cut: bool = True
    level: bool = True


class CodecPreviewRequest(BaseModel):
    file_path: str
    codec: str
    mp3_export: bool = False


class WaveformRequest(BaseModel):
    file_path: str
    bins: int = 240


class MasterRequest(BaseModel):
    file_path: str
    platform: str = "spotify"
    target_lufs: Optional[float] = None
    preset: str = "auto"
    intensity: int = 65
    character: float = Field(default=.5, ge=0, le=1, allow_inf_nan=False)
    format: str = "mp3128"
    output_dir: str = "./uploads/masters"
    master_id: Optional[str] = None             # DB record ID — used as output filename prefix
    analysis: Optional[dict] = None             # pre-computed analysis — skips librosa re-run
    reference_analysis: Optional[dict] = None   # optional reference track analysis for reference mastering
    overrides: Optional[dict] = None            # manuell nachjustierte Parameter (Whitelist in ai_params)


class ControlPreviewRequest(MasterRequest):
    start: float
    end: float


class PreviewSectionRequest(FilePathRequest):
    start: float
    end: float


# ─── Path validation ───────────────────────────────────────────────────────────

ALLOWED_UPLOAD_DIR = os.path.abspath(os.environ.get("TEMP_UPLOAD_DIR", "./uploads"))

def validate_file_path(file_path: str) -> str:
    """Resolve and validate that the path is within the allowed upload directory."""
    resolved = os.path.abspath(file_path)
    try:
        inside_uploads = os.path.commonpath([resolved, ALLOWED_UPLOAD_DIR]) == ALLOWED_UPLOAD_DIR
    except ValueError:
        inside_uploads = False
    if not inside_uploads:
        raise HTTPException(403, "Path outside allowed directory")
    if not os.path.exists(resolved):
        raise HTTPException(404, "File not found")
    return resolved


def validate_output_dir(output_dir: str) -> str:
    resolved = os.path.abspath(output_dir)
    expected = os.path.join(ALLOWED_UPLOAD_DIR, "masters")
    if resolved != expected:
        raise HTTPException(403, "Invalid output directory")
    return resolved


# ─── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "Beatzucker Python"}


@app.get("/jobs")
async def active_jobs():
    return {"active_master_ids": sorted(ACTIVE_MASTER_IDS)}


@app.post("/info")
async def get_info(req: FilePathRequest):
    """Get basic file info (duration, sample rate, etc.)."""
    try:
        req.file_path = validate_file_path(req.file_path)

        info = sf.info(req.file_path)
        max_duration = float(os.environ.get("MAX_AUDIO_DURATION_SECONDS", "1800"))
        max_sample_rate = int(os.environ.get("MAX_AUDIO_SAMPLE_RATE", "192000"))
        if info.channels not in (1, 2):
            raise HTTPException(415, "Only mono and stereo audio are supported")
        if info.samplerate <= 0 or info.samplerate > max_sample_rate:
            raise HTTPException(415, f"Sample rate may not exceed {max_sample_rate} Hz")
        if info.duration <= 0 or info.duration > max_duration:
            raise HTTPException(413, f"Audio may not exceed {max_duration:g} seconds")
        try:
            validate_full_dsp_audio(info)
        except ValueError as error:
            raise HTTPException(413, str(error))
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
async def analyze(req: AnalyzeRequest, request: Request = None):
    """Full audio analysis."""
    try:
        req.file_path = validate_file_path(req.file_path)

        permit = await acquire_dsp_slot()
        lease = DspLease(permit)
        try:
            if request is not None and await request.is_disconnected():
                raise HTTPException(499, "Client disconnected before processing")
            analysis = await lease.run(analyze_audio, req.file_path)
            return analysis_to_dict(analysis)
        finally:
            lease.release_when_done()
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error in /analyze")
        raise HTTPException(500, "Analysis failed")


class ShowcasePrepareRequest(BaseModel):
    original: str
    master: str
    start: float
    asset_id: str

@app.post("/showcase-prepare")
async def showcase_prepare(req: ShowcasePrepareRequest):
    original, master = validate_file_path(req.original), validate_file_path(req.master)
    permit = await acquire_dsp_slot()
    lease = DspLease(permit)
    try:
        return await lease.run(prepare_showcase, original, master, req.start, req.asset_id)
    except ValueError as error:
        raise HTTPException(422, str(error))
    except Exception:
        logger.exception("Showcase preparation failed")
        raise HTTPException(500, "Could not prepare listening examples")
    finally:
        lease.release_when_done()

@app.post("/meter")
async def meter(req: FilePathRequest):
    req.file_path = validate_file_path(req.file_path)
    permit = await acquire_dsp_slot()
    lease = DspLease(permit)
    try:
        return await lease.run(meter_audio, req.file_path)
    except ValueError as error:
        raise HTTPException(422, str(error))
    except Exception:
        logger.exception("Error in /meter")
        raise HTTPException(500, "Metering unavailable")
    finally:
        lease.release_when_done()


@app.post("/speech-clean")
async def speech_clean(req: SpeechCleanRequest):
    req.file_path = validate_file_path(req.file_path)
    if req.strength not in {"gentle", "balanced", "strong"}:
        raise HTTPException(400, "Invalid cleanup strength")
    permit = await acquire_dsp_slot()
    lease = DspLease(permit)
    try:
        audio, report = await lease.run(clean_speech, req.file_path, req.strength, req.low_cut, req.level)
        return Response(audio, media_type="audio/wav", headers={"Cache-Control": "no-store", "X-Speech-Report": json.dumps(report, allow_nan=False)})
    except ValueError as error:
        raise HTTPException(422, str(error))
    except Exception:
        logger.exception("Error in /speech-clean")
        raise HTTPException(500, "Speech cleanup failed")
    finally:
        lease.release_when_done()


@app.post("/codec-preview")
async def codec_preview(req: CodecPreviewRequest):
    req.file_path = validate_file_path(req.file_path)
    if req.codec not in {"aac256", "mp3320", "mp3128"}:
        raise HTTPException(400, "Unsupported codec")
    permit = await acquire_dsp_slot()
    lease = DspLease(permit)
    try:
        if req.mp3_export:
            audio, mime, measurements = await lease.run(render_codec, req.file_path, req.codec, True)
        else:
            audio, mime, measurements = await lease.run(render_codec, req.file_path, req.codec)
        headers = {"Cache-Control": "no-store", "X-Codec-Format": req.codec}
        for field, header in [("true_peak", "X-Encoded-True-Peak"), ("integrated_lufs", "X-Encoded-LUFS")]:
            if measurements.get(field) is not None:
                headers[header] = str(measurements[field])
        return Response(audio, media_type=mime, headers=headers)
    except ValueError as error:
        raise HTTPException(422, str(error))
    except Exception:
        logger.exception("Error in /codec-preview")
        raise HTTPException(500, "Codec rendering failed")
    finally:
        lease.release_when_done()


@app.post("/trim-normalize")
async def trim_normalize(req: TrimNormalizeRequest):
    req.file_path = validate_file_path(req.file_path)
    permit = await acquire_dsp_slot()
    lease = DspLease(permit)
    try:
        audio, stats = await lease.run(normalize_section, req.file_path, req.start, req.end, req.target)
        return Response(audio, media_type="audio/wav", headers={
            "X-Normalization-Stats": json.dumps(stats, allow_nan=False),
            "Cache-Control": "no-store",
        })
    except ValueError as error:
        raise HTTPException(422, str(error))
    except Exception:
        logger.exception("Error in /trim-normalize")
        raise HTTPException(500, "Normalization failed")
    finally:
        lease.release_when_done()


@app.post("/waveform")
async def waveform(req: WaveformRequest):
    """Return a compact overview without sending or decoding the source in the browser."""
    try:
        req.file_path = validate_file_path(req.file_path)
        if not 32 <= req.bins <= 512:
            raise HTTPException(400, "Waveform bin count out of range")

        permit = await acquire_dsp_slot()
        lease = DspLease(permit)
        try:
            max_duration = float(os.environ.get("MAX_AUDIO_DURATION_SECONDS", "1800"))
            peaks = await lease.run(
                extract_waveform_peaks, req.file_path, req.bins, 800, max_duration
            )
            return {"peaks": peaks}
        finally:
            lease.release_when_done()
    except HTTPException:
        raise
    except (subprocess.SubprocessError, ValueError):
        logger.exception("Error extracting waveform")
        raise HTTPException(422, "Waveform extraction failed")
    except Exception:
        logger.exception("Error in /waveform")
        raise HTTPException(500, "Waveform extraction failed")


@app.post("/preview-section")
async def preview_section(req: PreviewSectionRequest, request: Request):
    req.file_path = validate_file_path(req.file_path)
    permit = await acquire_dsp_slot(); lease = DspLease(permit)
    try:
        if await request.is_disconnected(): raise HTTPException(499, "Client disconnected")
        data = await lease.run(read_preview_section, req.file_path, req.start, req.end)
        return Response(data, media_type="audio/wav", headers={"Cache-Control": "no-store"})
    except ValueError as error:
        raise HTTPException(422, str(error))
    finally:
        lease.release_when_done()


@app.post("/control-preview")
async def control_preview(req: ControlPreviewRequest, request: Request):
    req.file_path = validate_file_path(req.file_path)
    if req.analysis is None or not 0 <= req.intensity <= 100:
        raise HTTPException(400, "Missing analysis or invalid intensity")
    permit = await acquire_dsp_slot()
    lease = DspLease(permit)
    try:
        if await request.is_disconnected():
            raise HTTPException(499, "Client disconnected")
        data = await lease.run(render_control, req.file_path, req.start, req.end, req.analysis,
                               req.platform, req.preset, req.intensity, req.target_lufs, req.reference_analysis, req.overrides, req.character)
        return Response(data, media_type="audio/wav", headers={"Cache-Control": "no-store"})
    except ValueError as error:
        raise HTTPException(422, str(error))
    finally:
        lease.release_when_done()


@app.post("/master")
async def master(req: MasterRequest, request: Request = None):
    """Full mastering chain with SSE progress streaming."""
    req.file_path = validate_file_path(req.file_path)
    req.output_dir = validate_output_dir(req.output_dir)
    if req.format not in {"wav32", "wav24", "wav16", "flac", "mp3320", "mp3128", "aac256"}:
        raise HTTPException(400, "Unsupported output format")
    if req.platform not in {"spotify", "apple", "youtube", "club", "tidal", "amazon", "deezer", "tiktok", "soundcloud", "broadcast", "custom"}:
        raise HTTPException(400, "Unsupported platform")
    if req.platform == "custom" and (req.target_lufs is None or not -23.0 <= req.target_lufs <= -6.0):
        raise HTTPException(400, "Custom LUFS target out of range")
    if not 0 <= req.intensity <= 100:
        raise HTTPException(400, "Intensity out of range")
    if req.master_id and not re.fullmatch(r"[A-Za-z0-9_-]{8,64}", req.master_id):
        raise HTTPException(400, "Invalid master id")
    permit = await acquire_dsp_slot(master=True)
    try:
        if request is not None and await request.is_disconnected():
            raise HTTPException(499, "Client disconnected before processing")
    except BaseException:
        permit.release()
        raise
    if req.master_id:
        ACTIVE_MASTER_IDS.add(req.master_id)
    lease = DspLease(permit, lambda: ACTIVE_MASTER_IDS.discard(req.master_id))

    # Real progress labels, keyed by the step names master_audio() actually emits
    # (see the emit() calls throughout mastering.py's master_audio()).
    STEP_LABELS = {
        "preparing": "Preparing mastering settings…",
        "dc": "Removing DC offset…", "gain": "Setting working level…",
        "deesser": "De-essing…", "final_eq": "Final EQ…",
        "bus_compression": "Bus compression…", "dithering": "Dithering and export…",
        "codec_verify": "Verifying output file and true peak…", "post_analysis": "Measuring finished master…",
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
                analysis_obj = await lease.run(analyze_audio, req.file_path)
                analysis_dict = analysis_to_dict(analysis_obj)

            yield encode({"step": "preparing", "progress": 18, "label": "Getting mastering parameters…"})

            # Rule-based mastering params — pure in-process computation, no external API.
            params = await lease.run(
                lambda: get_mastering_params(
                    analysis_dict, req.platform, req.preset, req.intensity,
                    target_lufs=req.target_lufs,
                    reference_analysis=req.reference_analysis,
                    overrides=req.overrides,
                    character=req.character,
                )
            )

            # Bridge master_audio()'s synchronous progress_callback (runs in a worker
            # thread) into this async generator via a thread-safe queue, so the SSE
            # stream reflects the actual DSP stage instead of a fixed sleep timer.
            progress_queue: asyncio.Queue = asyncio.Queue()

            def progress_cb(step: str, progress: int):
                loop.call_soon_threadsafe(progress_queue.put_nowait, (step, progress))

            mastering_task = lease.submit(
                master_audio, req.file_path, params, req.output_dir, progress_cb, req.format, analysis_dict, req.master_id
            )

            # Drain real progress events as they arrive; fall back to a heartbeat
            # (no new event yet) so the connection stays alive on slow stages.
            # master_audio()'s own internal "complete" event carries no payload
            # (no master_id/formats) — skip it, the real final event below does.
            # The heartbeat re-sends the *last real* step/progress rather than a
            # guessed higher number — a fabricated "97% rendering" would visibly
            # jump backward once the actual next stage (e.g. "ms" at 52%) arrives.
            last_step, last_progress = "preparing", 18
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

            result = await asyncio.shield(mastering_task)

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
            # Free the completed worker slot BEFORE announcing completion.
            # A second track may start as soon as the client receives this event.
            lease.release_when_done()
            yield encode({
                "step": "complete",
                "progress": 100,
                "master_id": result.master_id,
                "formats": formats,
                "selected_format": req.format,
                "post_analysis": post,
                "notes": result.notes,
                "params": _asdict(params),
                "genre": params.genre,
            })

        except Exception as e:
            logger.exception("Error in /master master_id=%s platform=%s preset=%s intensity=%s format=%s",
                             req.master_id, req.platform, req.preset, req.intensity, req.format)
            lease.release_when_done()
            yield encode({"step": "error", "progress": 0, "error": "Mastering failed",
                          "error_code": "memory" if isinstance(e, MemoryError) else "processing",
                          "master_id": req.master_id})
        finally:
            lease.release_when_done()

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
