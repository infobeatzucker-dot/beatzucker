"""One bounded inference per process. Float stems keep shared model levels."""
import os
import hashlib
import subprocess
import sys
from pathlib import Path

os.environ.setdefault("OMP_NUM_THREADS", "2")
os.environ.setdefault("MKL_NUM_THREADS", "2")
folder = Path(sys.argv[1])
preview = sys.argv[2] == "preview"
# Refuse unreviewed cache updates, even when inference is offline.
cache = Path(os.environ["HF_HOME"]) / "hub" / "models--adefossez--HTDemucs"
revision = "cbc8a9b1a87023b7fd74e7b3412e6321c0eab003"
if (cache / "refs" / "main").read_text().strip() != revision:
    raise RuntimeError("Unapproved model revision")
digest = hashlib.sha256()
with open(cache / "snapshots" / revision / "955717e8.safetensors", "rb") as weights:
    while chunk := weights.read(1024 * 1024):
        digest.update(chunk)
if digest.hexdigest() != "d9fa14133cfcc034a6758923bb3a8ca9f8dfd0b582134643bbf83f72c17576dd":
    raise RuntimeError("Model checksum mismatch")
# Decode ONLY the permitted excerpt for trials; full jobs cap at six minutes.
with open(folder / "source", "rb") as source:
    subprocess.run(["ffmpeg", "-v", "error", "-nostdin", "-protocol_whitelist", "pipe",
                    "-format_whitelist", "wav,mp3,flac,mov,aiff,ogg,aac", "-i", "pipe:0",
                    "-t", "20" if preview else "361", "-ac", "2", "-ar", "44100",
                    "-c:a", "pcm_f32le", "-y", str(folder / "decoded.wav")], stdin=source, check=True, timeout=60)
import numpy as np
import soundfile as sf
import torch
from demucs.api import Separator

torch.set_num_threads(2)
torch.set_num_interop_threads(1)
audio, sr = sf.read(folder / "decoded.wav", dtype="float32", always_2d=True)
(folder / "decoded.wav").unlink()
if len(audio) < sr or len(audio) > 360 * sr or not np.isfinite(audio).all():
    raise ValueError("Audio must be 1–360 seconds, finite")
separator = Separator(model="hf://htdemucs", device="cpu", shifts=1, overlap=.25, segment=7.8, jobs=0, progress=False)
with torch.inference_mode():
    _, stems = separator.separate_tensor(torch.from_numpy(np.ascontiguousarray(audio.T)), sr=sr)
for name, tensor in stems.items():
    result = tensor.cpu().numpy().T
    if not np.isfinite(result).all():
        raise ValueError("Non-finite model output")
    sf.write(folder / f"{name}.wav", result, separator.samplerate, subtype="FLOAT")
instrumental = sum(value for name, value in stems.items() if name != "vocals")
sf.write(folder / "instrumental.wav", instrumental.cpu().numpy().T, separator.samplerate, subtype="FLOAT")
