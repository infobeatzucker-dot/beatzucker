"""Inspect the actual delivery file with bounded FFprobe and FFmpeg runs."""
import json
import math
import os
import subprocess
import time
from pathlib import Path

from codec_preview import meter_audio


CODECS = {
    "wav": lambda codec: codec in {"pcm_s16le", "pcm_s24le", "pcm_s32le", "pcm_f32le", "pcm_f64le", "pcm_u8"},
    "mp3": lambda codec: codec == "mp3",
    "aac": lambda codec: codec == "aac",
    "m4a": lambda codec: codec == "aac",
}
CONTAINERS = {"wav": "wav", "mp3": "mp3", "m4a": "mov", "aac": "aac"}


def check_release(file_path):
    path = Path(file_path)
    extension = path.suffix.lower().lstrip(".")
    if not path.name.startswith("mixcheck-") or extension not in CODECS:
        raise ValueError("Unsupported release format.")
    ffmpeg = Path(os.environ.get("FFMPEG_BINARY", "ffmpeg"))
    ffprobe = ffmpeg.with_name("ffprobe" + ffmpeg.suffix)
    deadline = time.monotonic() + 145
    report = subprocess.run(
        [str(ffprobe), "-v", "error", "-protocol_whitelist", "file", "-max_streams", "4", "-show_entries",
         "stream=codec_type,codec_name,sample_rate,channels,bits_per_sample,bit_rate:format=format_name,duration,bit_rate",
         "-of", "json", str(path)],
        stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=12, check=True,
    )
    data = json.loads(report.stdout)
    streams = data["streams"]
    audio = [stream for stream in streams if stream.get("codec_type") == "audio"]
    if len(audio) != 1:
        raise ValueError("Expected one audio stream.")
    stream = audio[0]
    container = data["format"]
    codec = stream.get("codec_name", "")
    if not CODECS[extension](codec) or CONTAINERS[extension] not in container.get("format_name", "").split(","):
        raise ValueError("The file does not match its audio format.")
    duration = float(container.get("duration", 0))
    rate = int(stream.get("sample_rate", 0))
    channels = int(stream.get("channels", 0))
    if not math.isfinite(duration) or not 0 < duration <= 600 or channels not in (1, 2) or not 8000 <= rate <= 192000:
        raise ValueError("Check duration, channel count or sample rate.")
    bit_rate = stream.get("bit_rate") or container.get("bit_rate")
    return {
        **meter_audio(path, deadline=deadline, validate=False, local_protocols_only=True),
        "codec": codec, "container": extension, "channels": channels, "sample_rate": rate, "duration": duration,
        "bits": int(stream.get("bits_per_sample") or 0) or None,
        "bit_rate": int(bit_rate) if str(bit_rate).isdigit() else None,
    }
