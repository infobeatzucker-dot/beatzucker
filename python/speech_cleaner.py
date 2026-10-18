"""Bounded, conventional speech cleanup. No changes to the music mastering chain."""
import math
import os
import tempfile
import time
from pathlib import Path

import soundfile as sf
from codec_preview import run_process, meter_audio, validate_audio


def clean_speech(file_path, strength="gentle", low_cut=True, level=True):
    if strength not in {"gentle", "balanced", "strong"}:
        raise ValueError("Invalid cleanup strength")
    validate_audio(file_path)
    info = sf.info(file_path)
    if not .4 <= info.duration <= 300 or info.samplerate < 16000:
        raise ValueError("Use 0.4 seconds to 5 minutes of mono/stereo audio, 16–192 kHz")
    deadline = time.monotonic() + 140
    ffmpeg = os.environ.get("FFMPEG_BINARY", "ffmpeg")
    reduction = {"gentle": 6, "balanced": 12, "strong": 18}[strength]
    filters = (["highpass=f=70:p=2"] if low_cut else [])
    filters.append(f"afftdn=nr={reduction}:nf=-45:tn=1:gs=5")
    if level:
        filters.append("acompressor=threshold=0.125:ratio=2:attack=15:release=180:makeup=1:detection=rms:link=maximum")
    common = [ffmpeg, "-hide_banner", "-nostdin", "-v", "error", "-threads", "1"]
    def render(source, destination, graph, codec):
        run_process([*common, "-i", str(source), "-map", "0:a:0", "-vn", "-sn", "-dn",
                     "-map_metadata", "-1", "-filter_threads", "1", "-af", graph,
                     "-ar", "48000", "-c:a", codec, "-threads", "1", "-y", str(destination)], deadline)
    with tempfile.TemporaryDirectory(prefix="beatzucker-speech-") as directory:
        interim, output = Path(directory)/"clean.wav", Path(directory)/"speech.wav"
        render(file_path, interim, ",".join(filters), "pcm_f32le")
        measured = meter_audio(interim, deadline, validate=False)
        target = -19 if info.channels == 1 else -16
        loudness, peak = measured["integrated_lufs"], measured["true_peak"]
        if peak is None or loudness is None:
            raise ValueError("No measurable speech-level signal")
        # Never boost by more than 12 dB or above -1 dBTP. A target is not a promise.
        gain = min(target-loudness, 12, -1-peak) if level else min(0, -1-peak)
        if not math.isfinite(gain):
            raise ValueError("Invalid output gain")
        render(interim, output, f"volume={gain:.8f}dB,aresample=dither_method=triangular", "pcm_s24le")
        if not output.is_file() or not 44 < output.stat().st_size <= 96*1024*1024:
            raise ValueError("Invalid speech output size")
        final = meter_audio(output, deadline, validate=False)
        if final["true_peak"] is None or final["true_peak"] > -.8:
            raise ValueError("Speech output peak verification failed")
        return output.read_bytes(), {**final, "target_lufs": target if level else None,
                                     "gain_db": gain, "duration": info.duration, "channels": info.channels}
