"""Delivery and metering for audio already processed in the Mastering Lab."""
import math
import os
import time
from pathlib import Path

import soundfile as sf

from audio_limits import validate_full_dsp_audio
from codec_preview import meter_audio, run_process

FORMATS = {
    "wav32": ("wav", ["-c:a", "pcm_f32le"]),
    "wav24": ("wav", ["-c:a", "pcm_s24le"]),
    "wav16": ("wav", ["-c:a", "pcm_s16le"]),
    "flac": ("flac", ["-c:a", "flac", "-sample_fmt", "s32", "-bits_per_raw_sample", "24"]),
    "mp3320": ("mp3", ["-c:a", "libmp3lame", "-b:a", "320k"]),
    "mp3128": ("mp3", ["-c:a", "libmp3lame", "-b:a", "128k"]),
    "aac256": ("m4a", ["-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart"]),
}


def export_lab(file_path, format_id, ceiling, target):
    source = Path(file_path)
    if source.name != "source.wav" or not source.parent.name.startswith("lab-export-") or format_id not in FORMATS:
        raise ValueError("Invalid Lab export.")
    info = sf.info(source)
    validate_full_dsp_audio(info)
    if info.format not in ("WAV", "WAVEX") or info.subtype != "FLOAT" or info.duration > 720:
        raise ValueError("Expected a Lab float WAV up to 12 minutes.")
    if not math.isfinite(ceiling) or not -6 <= ceiling <= 0 or (target is not None and (not math.isfinite(target) or not -23 <= target <= -6)):
        raise ValueError("Invalid delivery target.")
    deadline = time.monotonic() + 180
    measured = meter_audio(source, deadline=deadline, validate=False)
    true_peak = measured["true_peak"]
    loudness = measured["integrated_lufs"]
    extension, options = FORMATS[format_id]
    output = source.with_name("delivery." + extension)
    executable = os.environ.get("FFMPEG_BINARY", "ffmpeg")
    trim = max(-24, min(12, target - loudness)) if target is not None and loudness is not None else 0
    reason = "target" if target is not None and loudness is not None else "level"
    if true_peak is not None:
        if ceiling - true_peak < trim:
            reason = "ceiling"
        trim = min(trim, ceiling - true_peak)
    for _ in range(4):
        filters = [f"volume={trim:.8f}dB"]
        if format_id == "wav16":
            filters.append("aresample=osf=s16:dither_method=triangular")
        elif format_id in ("flac", "wav24"):
            filters.append("aresample=osf=s32:output_sample_bits=24:dither_method=triangular")
        rates = ["-ar", str(min((32000, 44100, 48000), key=lambda rate: abs(rate - info.samplerate)))] if extension == "mp3" else []
        run_process([
            executable, "-hide_banner", "-nostdin", "-v", "error", "-threads", "1",
            "-i", str(source), "-map", "0:a:0", "-map_metadata", "-1",
            "-af", ",".join(filters), *options, *rates, "-threads", "1", "-y", str(output),
        ], deadline)
        measured = meter_audio(output, deadline=deadline, validate=False)
        peak = measured["true_peak"]
        if peak is None or peak <= ceiling + .05:
            return {**measured, "gain_db": round(trim, 3), "gain_reason": reason}
        reason = "codec"
        trim -= peak - ceiling + .15
    raise ValueError("Encoded output did not meet the true-peak ceiling.")
