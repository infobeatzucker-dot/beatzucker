"""Compact, bounded waveform extraction for the browser editor."""

import os
import subprocess

import numpy as np
import soundfile as sf


def _levels_from_samples(samples: np.ndarray, bins: int) -> np.ndarray:
    edges = np.linspace(0, samples.size, bins + 1, dtype=np.int64)
    levels = np.empty(bins, dtype=np.float64)
    for index in range(bins):
        segment = samples[edges[index]:edges[index + 1]]
        if segment.size == 0:
            levels[index] = 0.0
            continue
        absolute = np.abs(segment.astype(np.float64, copy=False))
        peak = float(np.max(absolute))
        rms = float(np.sqrt(np.mean(absolute * absolute)))
        levels[index] = peak * 0.65 + rms * 0.35
    return levels


def _levels_with_soundfile(file_path: str, bins: int) -> np.ndarray:
    """Bounded local fallback for development machines without ffmpeg."""
    levels = np.zeros(bins, dtype=np.float64)
    with sf.SoundFile(file_path) as audio:
        total_frames = len(audio)
        if total_frames <= 0:
            raise ValueError("Audio decoder returned no valid samples")
        for index in range(bins):
            start = index * total_frames // bins
            end = max(start + 1, (index + 1) * total_frames // bins)
            window_size = min(512, end - start)
            positions = np.linspace(start, max(start, end - window_size), 8, dtype=np.int64)
            peak, sum_squares, count = 0.0, 0.0, 0
            for position in np.unique(positions):
                audio.seek(int(position))
                chunk = audio.read(window_size, dtype="float32", always_2d=True)
                if chunk.size:
                    absolute = np.abs(chunk.astype(np.float64, copy=False))
                    peak = max(peak, float(np.max(absolute)))
                    sum_squares += float(np.sum(absolute * absolute))
                    count += absolute.size
            levels[index] = peak * 0.65 + np.sqrt(sum_squares / max(1, count)) * 0.35
    return levels


def extract_waveform_peaks(
    file_path: str,
    bins: int = 240,
    sample_rate: int = 800,
    max_duration_seconds: float = 1800,
) -> list[float]:
    """Decode a low-rate mono envelope and return normalized peak/RMS bins.

    ffmpeg performs the format-specific decoding and downsamples before any
    samples reach Python. Even at the maximum supported track length the
    temporary buffer remains below six MB, independent of the source rate.
    """
    if not 32 <= bins <= 512:
        raise ValueError("Waveform bin count out of range")
    if not 100 <= sample_rate <= 2000:
        raise ValueError("Waveform sample rate out of range")

    ffmpeg = os.environ.get("FFMPEG_BINARY", "ffmpeg")
    command = [
        ffmpeg, "-v", "error", "-nostdin", "-i", file_path,
        "-map", "0:a:0", "-ac", "1", "-ar", str(sample_rate),
        "-t", str(max_duration_seconds), "-f", "f32le", "pipe:1",
    ]
    try:
        completed = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
            timeout=max(30, min(120, int(max_duration_seconds / 20))),
        )
        samples = np.frombuffer(completed.stdout, dtype="<f4")
        if samples.size == 0 or not np.all(np.isfinite(samples)):
            raise ValueError("Audio decoder returned no valid samples")
        levels = _levels_from_samples(samples, bins)
    except (OSError, subprocess.SubprocessError):
        levels = _levels_with_soundfile(file_path, bins)

    positive = levels[levels > 0]
    ceiling = float(np.percentile(positive, 96)) if positive.size else 1.0
    normalized = np.clip(levels / max(ceiling, 1e-9), 0.06, 1.0)
    return [round(float(value), 4) for value in normalized]
