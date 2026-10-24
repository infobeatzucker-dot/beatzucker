"""
Audio Analysis Module
Returns comprehensive measurements for mastering parameter selection.
"""

import logging
import os
import numpy as np
import soundfile as sf
import librosa
import pyloudnorm as pyln
from scipy import signal as scipy_signal
from dataclasses import dataclass, asdict
from typing import Optional
from audio_limits import validate_full_dsp_audio
from reference_matching import tonal_profile
from song_sections import detect_sections

logger = logging.getLogger("mastering.analyzer")


@dataclass
class AudioAnalysis:
    # Loudness
    integrated_lufs: float
    true_peak: float
    dr_value: float
    crest_factor: float
    lra: float  # Loudness Range (EBU Tech 3342), dynamics spread in LU

    # Per-band RMS (dB)
    rms_sub: float   # 20-80 Hz
    rms_low: float   # 80-500 Hz
    rms_mid: float   # 500-5000 Hz
    rms_high: float  # 5000-12000 Hz
    rms_air: float   # 12000-20000 Hz

    # Spectral
    spectral_centroid: float
    spectral_rolloff: float
    spectral_flatness: float

    # Stereo
    stereo_width: float
    mono_compatibility: float

    # Musical
    bpm: float
    key: str

    # Technical
    transient_density: float
    clipping_detected: bool
    dc_offset: float
    duration_seconds: float
    sample_rate: int
    bit_depth: int
    channels: int
    bass_correlation: float = 1.0
    bass_side_ratio: float = 0.0
    tonal_profile: Optional[dict] = None
    sections: Optional[dict] = None


def measure_bass_stereo(audio: np.ndarray, sr: int) -> tuple[float, float]:
    """120 Hz correlation/side balance, bounded to six ten-second windows."""
    if audio.ndim != 2 or audio.shape[0] < 2:
        return 1.0, 0.0
    length = audio.shape[-1]
    window = min(length, sr * 10)
    starts = np.linspace(0, max(0, length - window), min(6, max(1, length // max(1, window))), dtype=int)
    sos = scipy_signal.butter(2, min(120, sr * .45), fs=sr, output="sos")
    ll = rr = lr = mid = side = 0.0
    for start in starts:
        low = scipy_signal.sosfilt(sos, audio[:2, start:start + window], axis=-1)
        low = low[:, min(sr // 10, max(0, low.shape[-1] // 4)):]
        left, right = low
        ll += float(np.sum(left * left)); rr += float(np.sum(right * right)); lr += float(np.sum(left * right))
        mid += float(np.sum((left + right) ** 2)); side += float(np.sum((left - right) ** 2))
    if ll + rr < 1e-12:
        return 1.0, 0.0
    corr = float(np.clip(lr / max(np.sqrt(ll * rr), 1e-12), -1, 1))
    return corr, float(min(20.0, np.sqrt(side / max(mid, 1e-12))))


def rms_band(audio: np.ndarray, sr: int, low_hz: float, high_hz: float) -> float:
    """Compute representative band RMS in dB with bounded memory.

    For long material, six evenly spaced ten-second windows are measured. Using
    only the first minute made intros disproportionately control automatic tonal
    decisions on tracks with breakdowns, fades or long quiet openings.
    """
    window_samples = max(1, sr * 10)
    if len(audio) <= sr * 60:
        chunks = [audio]
    else:
        starts = np.linspace(0, len(audio) - window_samples, 6, dtype=int)
        chunks = [audio[start:start + window_samples] for start in starts]

    nyq = sr / 2
    low = max(0.001, low_hz / nyq)
    high = min(0.999, high_hz / nyq)

    if low >= high:
        return -80.0

    # sosfilt = numerically stable SOS form, single-pass (low RAM), no overflow
    sos = scipy_signal.butter(4, [low, high], btype="bandpass", output="sos")
    energies = []
    for chunk in chunks:
        filtered = scipy_signal.sosfilt(sos, chunk)
        energies.append(float(np.mean(filtered ** 2)))
    rms = np.sqrt(np.mean(energies))

    if rms < 1e-10:
        return -80.0
    return float(20 * np.log10(rms))


def compute_dr(audio: np.ndarray, block_size: int = 4096) -> float:
    """Compute a DR-style crest metric from the loudest programme blocks.

    Peaks and RMS values must remain paired by block. Sorting the two lists
    independently can combine a peak from one moment with the RMS of another
    and produces a metric that describes no real section of the recording.
    """
    num_blocks = len(audio) // block_size
    if num_blocks < 2:
        return 0.0

    block_rms = []
    block_peak = []

    for i in range(num_blocks):
        block = audio[i * block_size:(i + 1) * block_size]
        rms = np.sqrt(np.mean(block ** 2))
        peak = np.max(np.abs(block))
        block_rms.append(rms)
        block_peak.append(peak)

    block_rms = np.asarray(block_rms)
    block_peak = np.asarray(block_peak)

    # Select the loudest 20% by RMS, then use the peaks from those same blocks.
    top_n = max(1, len(block_rms) // 5)
    indices = np.argpartition(block_rms, -top_n)[-top_n:]
    avg_peak = float(np.mean(block_peak[indices]))
    avg_rms = float(np.mean(block_rms[indices]))

    if avg_rms < 1e-10:
        return 0.0

    dr = 20 * np.log10(avg_peak / avg_rms)
    return float(np.clip(dr, 0, 30))


def detect_key(y: np.ndarray, sr: int) -> str:
    """Detect musical key using chroma features."""
    if not len(y) or not np.all(np.isfinite(y)) or np.sqrt(np.mean(y ** 2)) < 1e-6:
        return "Unknown"
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    mean_chroma = np.mean(chroma, axis=1)
    if not np.all(np.isfinite(mean_chroma)) or np.std(mean_chroma) < 1e-6:
        return "Unknown"
    note_idx = int(np.argmax(mean_chroma))

    notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

    # Simple major/minor detection via chroma profile correlation
    major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
    minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

    best_key = note_idx
    best_score = -1
    is_minor = False

    for root in range(12):
        shifted_major = np.roll(major_profile, root)
        shifted_minor = np.roll(minor_profile, root)

        score_major = np.corrcoef(mean_chroma, shifted_major)[0, 1]
        score_minor = np.corrcoef(mean_chroma, shifted_minor)[0, 1]

        if score_major > best_score:
            best_score = score_major
            best_key = root
            is_minor = False
        if score_minor > best_score:
            best_score = score_minor
            best_key = root
            is_minor = True

    if not np.isfinite(best_score) or best_score < 0.45:
        return "Unknown"
    return f"{notes[best_key]} {'minor' if is_minor else 'major'}"


def compute_true_peak(audio: np.ndarray, sr: int, oversample: int = 4,
                      block_sec: float = 30.0, overlap_sec: float = 0.05) -> float:
    """Channel-aware, full-programme true peak with bounded memory.

    ``audio`` is mono [samples] or channel-first [channels, samples]. Each block
    includes overlap and only its valid centre is measured, avoiding resampler
    edge artefacts while still scanning the complete file.
    """
    data = np.asarray(audio, dtype=np.float32)
    n = data.shape[-1]
    if n == 0:
        return -120.0
    block = max(1, int(block_sec * sr))
    overlap = max(0, int(overlap_sec * sr))
    peak = 0.0
    pos = 0
    while pos < n:
        start = max(0, pos - overlap)
        valid_len = min(block, n - pos)
        end = min(n, pos + valid_len + overlap)
        chunk = data[..., start:end]
        upsampled = scipy_signal.resample_poly(chunk, oversample, 1, axis=-1)
        valid_start = (pos - start) * oversample
        valid_end = valid_start + valid_len * oversample
        if valid_end > valid_start:
            peak = max(peak, float(np.max(np.abs(upsampled[..., valid_start:valid_end]))))
        del upsampled
        pos += valid_len
    if peak < 1e-10:
        return -120.0
    return float(20 * np.log10(peak))


def compute_lra(audio: np.ndarray, sr: int) -> float:
    """Loudness Range (LRA) per EBU Tech 3342.

    Measures the statistical spread of short-term loudness across the track:
    K-weighted 3-second blocks (1s hop), absolute-gated at -70 LUFS, then
    relative-gated at -20 LU below the mean of the absolute-gated blocks.
    LRA = 95th percentile − 10th percentile of the doubly-gated block
    loudness values. Higher LRA = more dynamic; heavy compression/limiting
    reduces it. Reuses the K-weighting filters from pyloudnorm's Meter
    (same filters used for integrated LUFS) rather than reimplementing them.
    """
    try:
        data = audio.T if audio.ndim == 2 else audio.reshape(-1, 1)
        if data.shape[0] < sr * 3:
            return 0.0  # too short to measure meaningfully

        meter = pyln.Meter(sr)
        filtered = data.astype(np.float64).copy()
        for (_, filter_stage) in meter._filters.items():
            for ch in range(filtered.shape[1]):
                filtered[:, ch] = filter_stage.apply_filter(filtered[:, ch])

        n_ch = filtered.shape[1]
        G = [1.0, 1.0, 1.0, 1.41, 1.41][:n_ch]
        block_sec, hop_sec = 3.0, 1.0
        n_samples = filtered.shape[0]
        n_blocks = int((n_samples / sr - block_sec) / hop_sec) + 1
        if n_blocks < 1:
            return 0.0

        z = np.zeros((n_ch, n_blocks))
        for j in range(n_blocks):
            lo = int(j * hop_sec * sr)
            hi = int((j * hop_sec + block_sec) * sr)
            for ch in range(n_ch):
                z[ch, j] = np.mean(filtered[lo:hi, ch] ** 2)

        with np.errstate(divide="ignore", invalid="ignore"):
            block_loudness = -0.691 + 10.0 * np.log10(
                np.sum([G[ch] * z[ch] for ch in range(n_ch)], axis=0)
            )

        block_energy = np.sum([G[ch] * z[ch] for ch in range(n_ch)], axis=0)
        abs_mask = np.isfinite(block_loudness) & (block_loudness >= -70.0)
        abs_gated = block_loudness[abs_mask]
        if len(abs_gated) == 0:
            return 0.0

        # EBU relative gating is derived from mean linear energy, not from the
        # arithmetic mean of logarithmic LUFS values.
        mean_abs_energy = float(np.mean(block_energy[abs_mask]))
        rel_threshold = -0.691 + 10.0 * np.log10(max(mean_abs_energy, 1e-20)) - 20.0
        rel_gated = abs_gated[abs_gated >= rel_threshold]
        if len(rel_gated) == 0:
            return 0.0

        return float(max(0.0, np.percentile(rel_gated, 95) - np.percentile(rel_gated, 10)))
    except Exception:
        # meter._filters is a private pyloudnorm API — log so a future pyloudnorm
        # version bump that renames/removes it doesn't silently degrade every
        # track to LRA=0 without anyone noticing.
        logger.warning("compute_lra failed, returning 0.0", exc_info=True)
        return 0.0


def analyze_audio(file_path: str) -> AudioAnalysis:
    """Perform full audio analysis on a file."""
    info = sf.info(file_path)
    validate_full_dsp_audio(info)

    # Load only after cheap metadata validation to avoid memory exhaustion from
    # very long compressed files or unsupported multichannel containers.
    y, sr = librosa.load(file_path, sr=None, mono=False)

    channels = y.ndim
    is_stereo = channels == 2

    # Mono mix for analysis
    if is_stereo:
        mono = librosa.to_mono(y)
        left = y[0]
        right = y[1]
    else:
        mono = y if y.ndim == 1 else y[0]
        left = mono
        right = mono

    duration = len(mono) / sr

    # Keep the real mono sum for phase diagnostics, but do not let cancellation
    # erase all musical/spectral information. Use the stronger channel only
    # when the mono sum is almost cancelled; loudness/peaks remain channel-aware.
    if is_stereo:
        channel_rms = np.sqrt(np.mean(y ** 2, axis=1))
        if np.sqrt(np.mean(mono ** 2)) < 0.1 * max(float(np.max(channel_rms)), 1e-10):
            mono = y[int(np.argmax(channel_rms))]

    # Integrated LUFS (ITU-R BS.1770-4)
    meter = pyln.Meter(sr)
    if is_stereo:
        lufs_input = np.stack([left, right], axis=1)
    else:
        lufs_input = mono.reshape(-1, 1)
    integrated_lufs = float(meter.integrated_loudness(lufs_input))

    # True Peak
    true_peak = compute_true_peak(y, sr)

    # Dynamic Range
    dr_value = compute_dr(mono)

    # Loudness Range
    lra = compute_lra(y, sr)

    # Crest factor
    rms_total = np.sqrt(np.mean(mono ** 2))
    peak_total = np.max(np.abs(mono))
    crest_factor = float(max(0.0, 20 * np.log10(max(peak_total, 1e-10) / max(rms_total, 1e-10))))

    # Per-band RMS
    rms_sub  = rms_band(mono, sr,    20,    80)
    rms_low  = rms_band(mono, sr,    80,   500)
    rms_mid  = rms_band(mono, sr,   500,  5000)
    rms_high = rms_band(mono, sr,  5000, 12000)
    rms_air  = rms_band(mono, sr, 12000, 20000)

    # Spectral features
    spectral_centroid = float(np.mean(librosa.feature.spectral_centroid(y=mono, sr=sr)))
    spectral_rolloff  = float(np.mean(librosa.feature.spectral_rolloff(y=mono, sr=sr, roll_percent=0.85)))
    spectral_flatness = float(np.clip(np.mean(librosa.feature.spectral_flatness(y=mono)), 0.0, 1.0)) if rms_total > 1e-10 else 0.0

    # Stereo analysis
    if is_stereo:
        mid  = (left + right) / 2
        side = (left - right) / 2
        mid_rms  = np.sqrt(np.mean(mid  ** 2))
        side_rms = np.sqrt(np.mean(side ** 2))
        # 20 is a saturated diagnostic value, not an unbounded physical ratio.
        # Near-total mono cancellation remains explicit through correlation.
        stereo_width = float(min(20.0, side_rms / max(mid_rms, 1e-10)))

        # Mono compatibility: correlation between L and R
        if np.std(left) > 0 and np.std(right) > 0:
            mono_compat = float(np.corrcoef(left, right)[0, 1])
        else:
            mono_compat = 1.0
    else:
        stereo_width = 0.0
        mono_compat = 1.0

    # BPM
    try:
        tempo, _ = librosa.beat.beat_track(y=mono, sr=sr)
        bpm = float(tempo) if np.isscalar(tempo) else float(tempo[0])
    except Exception:
        bpm = 0.0

    # Key
    try:
        key = detect_key(mono, sr)
    except Exception:
        key = "Unknown"

    # Transient density
    try:
        onset_env = librosa.onset.onset_strength(y=mono, sr=sr)
        onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr)
        transient_density = float(len(onsets) / max(duration, 1.0))
    except Exception:
        transient_density = 0.0

    # Clipping detection
    # Sample overs/full-scale peaks, not an assertion about historical clipping.
    clipping_detected = bool(np.any(np.abs(y) >= 1.0 - 1e-7))

    # DC offset
    channel_dc = np.atleast_1d(np.mean(y, axis=-1))
    dc_offset = float(channel_dc[int(np.argmax(np.abs(channel_dc)))])

    bass_correlation, bass_side_ratio = measure_bass_stereo(y, sr)
    return AudioAnalysis(
        integrated_lufs=integrated_lufs,
        true_peak=true_peak,
        dr_value=dr_value,
        crest_factor=crest_factor,
        lra=lra,
        rms_sub=rms_sub,
        rms_low=rms_low,
        rms_mid=rms_mid,
        rms_high=rms_high,
        rms_air=rms_air,
        spectral_centroid=spectral_centroid,
        spectral_rolloff=spectral_rolloff,
        spectral_flatness=spectral_flatness,
        stereo_width=stereo_width,
        mono_compatibility=mono_compat,
        bpm=bpm,
        key=key,
        transient_density=transient_density,
        clipping_detected=clipping_detected,
        dc_offset=dc_offset,
        duration_seconds=duration,
        sample_rate=sr,
        bit_depth=_parse_bit_depth(info.subtype),
        channels=2 if is_stereo else 1,
        bass_correlation=bass_correlation,
        bass_side_ratio=bass_side_ratio,
        tonal_profile=tonal_profile(y, sr),
        sections=detect_sections(y, sr),
    )


def _parse_bit_depth(subtype: str) -> int:
    """Parse bit depth from a soundfile *subtype* string, e.g. 'PCM_24' → 24.

    Lossy subtypes return 0 because MP3/AAC have no meaningful PCM bit depth.
    """
    if not subtype:
        return 0
    s = subtype.split()[0].upper()
    if s == "FLOAT":
        return 32
    if s == "DOUBLE":
        return 64
    if s in {"S8", "U8"}:
        return 8
    if not s.startswith("PCM_"):
        # Lossy codecs do not have a meaningful PCM bit depth.
        return 0
    try:
        return int(s.replace("PCM_", ""))
    except ValueError:
        return 0


def _sanitize_float(v, default: float = 0.0) -> float:
    """Replace NaN / ±Inf with a safe default so JSON serialization never fails."""
    import math
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return default
    return v


def analysis_to_dict(a: AudioAnalysis) -> dict:
    d = asdict(a)
    # Sanitize every float field – pyloudnorm can emit -inf, librosa can emit NaN
    FLOAT_DEFAULTS: dict = {
        "integrated_lufs": -70.0,
        "true_peak":       -120.0,
        "dr_value":         0.0,
        "crest_factor":     0.0,
        "lra":              0.0,
        "rms_sub":         -80.0,
        "rms_low":         -80.0,
        "rms_mid":         -80.0,
        "rms_high":        -80.0,
        "rms_air":         -80.0,
        "spectral_centroid": 0.0,
        "spectral_rolloff":  0.0,
        "spectral_flatness": 0.0,
        "stereo_width":      0.0,
        "mono_compatibility": 1.0,
        "bpm":               0.0,
        "transient_density": 0.0,
        "dc_offset":         0.0,
        "duration_seconds":  0.0,
    }
    for key, default in FLOAT_DEFAULTS.items():
        if key in d:
            d[key] = _sanitize_float(d[key], default)
    if d.get("tonal_profile") is None:
        d.pop("tonal_profile", None)
    if d.get("sections") is None:
        d.pop("sections", None)
    return d
