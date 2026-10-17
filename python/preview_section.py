"""Bounded raw source for buffered live audition; no mastering or saved files."""
import io
import math
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
from audio_limits import validate_full_dsp_audio


def read_preview_section(file_path, start, end):
    if not all(math.isfinite(v) for v in (start, end)) or start < 0 or not .001 <= end - start <= 20.01:
        raise ValueError("Invalid preview section")
    info = sf.info(file_path); validate_full_dsp_audio(info)
    if end > info.duration + .02:
        raise ValueError("Preview exceeds source")
    audio, rate = sf.read(file_path, start=int(start * info.samplerate), stop=min(info.frames, int(end * info.samplerate)), dtype="float32", always_2d=True)
    if not len(audio) or not np.isfinite(audio).all():
        raise ValueError("Invalid source samples")
    # Live audition is capped at 48k. Original and final exports are untouched.
    if rate > 48000:
        divisor = math.gcd(rate, 48000)
        audio = resample_poly(audio, 48000 // divisor, rate // divisor, axis=0).astype(np.float32); rate = 48000
    output = io.BytesIO(); sf.write(output, audio, rate, format="WAV", subtype="FLOAT")
    return output.getvalue()
