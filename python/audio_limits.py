"""Validate the decoded allocation before full-array DSP, not only upload bytes."""
import math
import os


def validate_full_dsp_audio(info):
    maximum = int(os.environ.get("MAX_DSP_CHANNEL_SAMPLES", "64000000"))
    max_duration = float(os.environ.get("MAX_AUDIO_DURATION_SECONDS", "1800"))
    if info.channels not in (1, 2):
        raise ValueError("Only mono and stereo audio are supported")
    if not 8000 <= info.samplerate <= 192000:
        raise ValueError("Use audio at 8–192 kHz")
    if not math.isfinite(info.duration) or not 0 < info.duration <= max_duration:
        raise ValueError(f"Audio duration must be between 0 and {max_duration:g} seconds")
    # Mastering expands mono to stereo. Keep /info, analysis and master consistent.
    samples = max(info.frames, math.ceil(info.duration * info.samplerate)) * 2
    if samples <= 0 or samples > maximum:
        raise ValueError("Audio exceeds the processing memory budget. Use a shorter track or a lower sample rate.")
