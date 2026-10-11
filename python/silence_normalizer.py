"""Trim/fade, measure the kept programme, normalize without a limiter, verify PCM."""
import math
import tempfile
from pathlib import Path

import numpy as np
import pyloudnorm as pyln
import soundfile as sf

from analyzer import compute_true_peak

MAX_SELECTED_SAMPLES = 32_000_000
CEILING_DBTP = -1.0


def measure(audio, sr):
    loudness = float(pyln.Meter(sr).integrated_loudness(audio))
    if not math.isfinite(loudness):
        raise ValueError("The selected section is too quiet to measure loudness.")
    return {"integrated_lufs": loudness,
            "true_peak": compute_true_peak(audio.T, sr)}


def normalize_section(file_path, start, end, target):
    if not all(math.isfinite(v) for v in (start, end, target)) or not -23 <= target <= -9:
        raise ValueError("Invalid cut points or loudness target.")
    try:
        info = sf.info(file_path)
    except RuntimeError:
        raise ValueError("The audio file could not be decoded.")
    if info.channels not in (1, 2) or not 8000 <= info.samplerate <= 192000 or info.duration > 600:
        raise ValueError("Use mono/stereo audio up to 10 minutes at 8–192 kHz.")
    if start < 0 or end > info.duration + 0.02 or end <= start:
        raise ValueError("Invalid cut points.")
    first = int(start * info.samplerate)
    last = min(info.frames, int(end * info.samplerate))
    frames = last - first
    if frames < math.ceil(0.4 * info.samplerate):
        raise ValueError("Select at least 0.4 seconds for integrated loudness measurement.")
    if frames * info.channels > MAX_SELECTED_SAMPLES:
        raise ValueError("The selected section exceeds the memory budget. Please select a shorter section.")
    audio, sr = sf.read(file_path, start=first, stop=last, dtype="float32", always_2d=True)
    if not np.isfinite(audio).all():
        raise ValueError("Audio contains invalid samples.")
    fade = min(round(0.01 * sr), frames // 2)
    if fade > 1:
        ramp = np.linspace(0, 1, fade, dtype=np.float32)
        audio[:fade] *= ramp[:, None]
        audio[-fade:] *= ramp[::-1, None]
    before = measure(audio, sr)
    desired = target - before["integrated_lufs"]
    # Also apply the ceiling when attenuating already-hot material.
    gain_db = min(desired, CEILING_DBTP - 0.01 - before["true_peak"])
    rng = np.random.default_rng()
    with tempfile.TemporaryDirectory(prefix="beatzucker-trim-") as directory:
        output = Path(directory) / "normalized.wav"
        for attempt in range(3):
            gain = 10 ** (gain_db / 20)
            # Block-wise TPDF dither avoids allocating another programme-sized array.
            with sf.SoundFile(output, "w", samplerate=sr, channels=info.channels, subtype="PCM_24") as writer:
                for offset in range(0, frames, 65536):
                    block = audio[offset:offset + 65536] * gain
                    block += ((rng.random(block.shape) - rng.random(block.shape)) / 8388608).astype(np.float32)
                    writer.write(block)
            decoded, _ = sf.read(output, dtype="float32", always_2d=True)
            after = measure(decoded, sr)
            del decoded
            if after["true_peak"] > CEILING_DBTP:
                if attempt == 2:
                    raise ValueError("The output peak could not be verified safely.")
                gain_db -= after["true_peak"] - CEILING_DBTP + 0.01
                continue
            # Absolute LUFS gating can change after gain. Correct using the
            # measured export, but never sacrifice the peak ceiling.
            correction = min(target - after["integrated_lufs"], CEILING_DBTP - 0.01 - after["true_peak"])
            if attempt < 2 and abs(correction) > 0.05:
                gain_db += correction
                continue
            break
        stats = {"before": before, "after": after, "gain_db": gain_db,
                 "target_lufs": target, "peak_limited": after["integrated_lufs"] < target - 0.1 and after["true_peak"] > CEILING_DBTP - 0.1,
                 "start": first / sr, "end": last / sr, "duration": frames / sr,
                 "sample_rate": sr, "channels": info.channels}
        return output.read_bytes(), stats
