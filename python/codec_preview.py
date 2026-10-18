"""Codec encoding and lightweight metering, always run under the shared DSP lease."""
import json
import logging
import math
import os
import re
import subprocess
import tempfile
import time
import threading
from pathlib import Path

import soundfile as sf

FORMATS = {
    "aac256": ("m4a", "audio/mp4", ["-c:a", "aac", "-b:a", "256k"]),
    "mp3320": ("mp3", "audio/mpeg", ["-c:a", "libmp3lame", "-b:a", "320k"]),
    "mp3128": ("mp3", "audio/mpeg", ["-c:a", "libmp3lame", "-b:a", "128k"]),
}


def validate_audio(file_path):
    try:
        info = sf.info(file_path)
    except RuntimeError:
        raise ValueError("The audio file could not be decoded.")
    if info.channels not in (1, 2) or not 0 < info.samplerate <= 192000:
        raise ValueError("Use mono or stereo audio up to 192 kHz.")
    if not math.isfinite(info.duration) or not 0 < info.duration <= 600:
        raise ValueError("Codec previews support audio up to 10 minutes.")


def run_process(arguments, deadline):
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        raise subprocess.TimeoutExpired(arguments, 0)
    # Drain stderr continuously, retain only its tail, and cap total diagnostics.
    # No unlimited temporary log file or communicate() buffer.
    process = subprocess.Popen(arguments, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    tail = bytearray()
    excessive = threading.Event()
    def drain():
        total = 0
        while True:
            chunk = process.stderr.read(8192)
            if not chunk:
                break
            total += len(chunk)
            tail.extend(chunk)
            if len(tail) > 65536:
                del tail[:-65536]
            if total > 1024 * 1024:
                excessive.set()
                try:
                    process.kill()
                except OSError:
                    pass
                break
    reader = threading.Thread(target=drain, daemon=True)
    reader.start()
    try:
        try:
            code = process.wait(timeout=remaining)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
            raise
    finally:
        reader.join()
        process.stderr.close()
    if excessive.is_set():
        raise ValueError("Codec process exceeded the diagnostic budget.")
    if code:
        raise subprocess.CalledProcessError(code, arguments)
    return tail.decode("utf-8", errors="replace")


def parse_meter_report(log):
    for block in reversed(re.findall(r"\{[^{}]*\}", log)):
        try:
            report = json.loads(block)
        except ValueError:
            continue
        if "input_i" not in report or "input_tp" not in report:
            continue
        def measured(key):
            value = float(report[key])
            return value if math.isfinite(value) else None
        return {"integrated_lufs": measured("input_i"), "true_peak": measured("input_tp")}
    raise ValueError("Meter returned no valid measurements.")


def meter_audio(file_path, deadline=None, validate=True):
    if validate:
        validate_audio(file_path)
    if deadline is None:
        deadline = time.monotonic() + 140
    ffmpeg = os.environ.get("FFMPEG_BINARY", "ffmpeg")
    log = run_process([
        ffmpeg, "-hide_banner", "-nostats", "-nostdin", "-v", "info", "-threads", "1",
        "-i", str(file_path), "-map", "0:a:0", "-vn", "-sn", "-dn", "-filter_threads", "1",
        "-af", "loudnorm=I=-14:TP=-1:LRA=11:print_format=json", "-f", "null", "-",
    ], deadline)
    # Only INPUT measurements: the filter's processed output is discarded.
    # The actual encoded preview remains untouched.
    return parse_meter_report(log)


def render_codec(file_path, codec, mp3_export=False):
    if codec not in FORMATS:
        raise ValueError("Unsupported codec.")
    if mp3_export and codec not in {"mp3128", "mp3320"}:
        raise ValueError("MP3 export requires an MP3 codec.")
    validate_audio(file_path)
    deadline = time.monotonic() + 140
    extension, mime, arguments = FORMATS[codec]
    if mp3_export:
        # MPEG-1 sample rates support the advertised 128/320 kbit/s. Without
        # this, low-rate WAV input can silently clamp a 320k request to 160k.
        # Opt-in for the new converter ONLY; existing previews are unchanged.
        source_rate = sf.info(file_path).samplerate
        target_rate = min((32000,44100,48000), key=lambda rate: abs(rate-source_rate))
        arguments = [*arguments, "-ar", str(target_rate)]
    ffmpeg = os.environ.get("FFMPEG_BINARY", "ffmpeg")
    with tempfile.TemporaryDirectory(prefix="beatzucker-codec-") as directory:
        output = Path(directory) / f"preview.{extension}"
        run_process([
            ffmpeg, "-hide_banner", "-nostdin", "-v", "error", "-threads", "1", "-i", str(file_path),
            "-map", "0:a:0", "-map_metadata", "-1", "-vn", "-sn", "-dn",
            *arguments, "-threads", "1", "-y", str(output),
        ], deadline)
        if not output.is_file() or not 0 < output.stat().st_size <= 32 * 1024 * 1024:
            raise ValueError("Invalid codec output size.")
        measurements = {"true_peak": None, "integrated_lufs": None}
        try:
            measurements = meter_audio(output, deadline=deadline, validate=False)
        except (ValueError, OSError, subprocess.SubprocessError):
            logging.getLogger("beatzucker").warning("Encoded preview measurement unavailable")
        return output.read_bytes(), mime, measurements
