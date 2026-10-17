"""Short, private control render using the actual export DSP, without a master job."""
import io
import math
import numpy as np
import soundfile as sf

from ai_params import get_mastering_params
from audio_limits import validate_full_dsp_audio
from mastering import process_mastering_audio


def render_control(file_path, start, end, analysis, platform, preset, intensity, target_lufs, reference, overrides):
    if not all(math.isfinite(v) for v in (start, end)) or start < 0 or not .4 <= end - start <= 20.01:
        raise ValueError("Select 0.4–20 seconds for the control render")
    info = sf.info(file_path)
    validate_full_dsp_audio(info)
    if end > info.duration + .02:
        raise ValueError("Selection exceeds source duration")
    # One second of real leading/trailing context reduces boundary artefacts.
    first = max(0, int(start * info.samplerate) - info.samplerate)
    last = min(info.frames, int(end * info.samplerate) + info.samplerate)
    audio, sr = sf.read(file_path, start=first, stop=last, dtype="float32", always_2d=True)
    if not np.all(np.isfinite(audio)):
        raise ValueError("Invalid audio samples")
    params = get_mastering_params(analysis, platform, preset, intensity, target_lufs, reference, overrides)
    rendered = process_mastering_audio(audio.T, sr, params)
    begin = int(start * sr) - first; count = min(int((end - start) * sr), rendered.shape[-1] - begin)
    rendered = rendered[:, begin:begin + count]
    # Tiny fades avoid playback clicks at audition boundaries; never alter source.
    fade = min(round(sr * .005), count // 2)
    if fade > 1:
        ramp = np.linspace(0, 1, fade, dtype=np.float32)
        rendered[:, :fade] *= ramp; rendered[:, -fade:] *= ramp[::-1]
    output = io.BytesIO(); sf.write(output, rendered.T, sr, format="WAV", subtype="FLOAT")
    return output.getvalue()
