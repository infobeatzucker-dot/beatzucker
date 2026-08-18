"""
Professional Mastering Chain
Multi-stage DSP pipeline using pedalboard, scipy, pyloudnorm
"""

import numpy as np
import soundfile as sf
import librosa
import pyloudnorm as pyln
from pedalboard import Pedalboard, HighpassFilter, LowShelfFilter, HighShelfFilter, PeakFilter, Distortion, Gain
from scipy import signal as scipy_signal
from scipy.ndimage import maximum_filter1d
from numba import jit
import os
import uuid
from dataclasses import dataclass
from typing import Callable, Optional

from ai_params import MasteringParams
from analyzer import compute_dr, rms_band, compute_lra


@dataclass
class MasteringResult:
    master_id: str
    paths: dict  # format -> file_path
    post_analysis: dict
    notes: str


def db_to_linear(db: float) -> float:
    return 10 ** (db / 20)


def linear_to_db(linear: float) -> float:
    if linear < 1e-10:
        return -120.0
    return 20 * np.log10(linear)


# ─── 1. INPUT STAGE ────────────────────────────────────────────────────────────

def normalize_to_reference_lufs(audio: np.ndarray, sr: int, reference_lufs: float = -18.0,
                                 max_gain_db: float = 24.0) -> np.ndarray:
    """Gain-stage the input to a fixed reference loudness before any level-dependent
    processing (EQ, multiband compression, saturation, bus comp) runs.

    Every threshold in this chain (mb_sub_threshold, bus_comp_threshold, ...) is an
    absolute dBFS value and is calibrated against THIS reference level — changing
    reference_lufs without moving those thresholds will silently under- or
    over-drive the compressors. Without this step, the exact same preset/intensity
    setting would compress a track delivered at -8 LUFS far more than one delivered
    at -24 LUFS, purely because of how the source was gain-staged before upload —
    not because of anything about the actual "intensity" the user asked for.
    Normalizing to a fixed reference first makes processing consistent regardless
    of input loudness; the final platform-LUFS target is still applied later by
    apply_true_peak_limiter(), so this doesn't change the delivered loudness.
    """
    meter = pyln.Meter(sr)
    lufs_in = audio.T if audio.ndim == 2 else audio.reshape(-1, 1)
    current_lufs = meter.integrated_loudness(lufs_in)
    if not np.isfinite(current_lufs):
        return audio  # silence / too short to measure meaningfully — leave as-is

    gain_db = float(np.clip(reference_lufs - current_lufs, -max_gain_db, max_gain_db))
    gain = db_to_linear(gain_db)

    # Peak-safety: don't let the reference gain push transients into clipping —
    # downstream stages (EQ boosts, saturation) expect headroom, not overs.
    peak = float(np.max(np.abs(audio)))
    if peak > 1e-9:
        gain = min(gain, 0.98 / peak)

    return (audio * gain).astype(np.float32)


def remove_dc_simple(audio: np.ndarray) -> np.ndarray:
    """Simple DC offset removal via mean subtraction."""
    if audio.ndim == 2:
        audio[0] -= np.mean(audio[0])
        audio[1] -= np.mean(audio[1])
    else:
        audio -= np.mean(audio)
    return audio


def check_phase_correlation(left: np.ndarray, right: np.ndarray) -> float:
    """Check L/R phase correlation."""
    corr = np.corrcoef(left, right)[0, 1]
    return float(corr)


# ─── 4. CORRECTION EQ ──────────────────────────────────────────────────────────

def apply_correction_eq(audio: np.ndarray, sr: int, params: MasteringParams) -> np.ndarray:
    """Apply correction EQ using pedalboard."""
    board = Pedalboard([
        HighpassFilter(cutoff_frequency_hz=params.highpass_freq),
        LowShelfFilter(
            cutoff_frequency_hz=params.low_shelf_freq,
            gain_db=params.low_shelf_gain,
            q=0.707,
        ),
        PeakFilter(
            cutoff_frequency_hz=params.mid_notch_freq,
            gain_db=params.mid_notch_gain,
            q=params.mid_notch_q,
        ),
        PeakFilter(
            cutoff_frequency_hz=params.presence_freq,
            gain_db=params.presence_gain,
            q=1.2,
        ),
        HighShelfFilter(
            cutoff_frequency_hz=params.air_freq,
            gain_db=params.air_gain,
            q=0.707,
        ),
    ])

    if audio.ndim == 2:
        processed = np.stack([
            board(audio[0:1].T, sr).T[0],
            board(audio[1:2].T, sr).T[0],
        ])
    else:
        processed = board(audio.reshape(1, -1).T, sr).T[0]

    return processed


# ─── 5. MULTIBAND COMPRESSION ──────────────────────────────────────────────────

def linkwitz_riley_crossover(audio: np.ndarray, sr: int, crossover_hz: float, order: int = 4):
    """Split audio into low and high bands using a true Linkwitz-Riley crossover.
    Two cascaded Butterworth filters (LR4) give a flat summed response and
    identical phase in both bands — eliminates comb filtering at the crossover.
    sosfilt = numerically stable SOS form + single-pass (low RAM, no overflow).
    """
    nyq = sr / 2
    norm_freq = float(np.clip(crossover_hz / nyq, 0.01, 0.99))

    # True LR: cascade two identical Butterworth filters of order/2 each.
    # Both LP and HP are –6 dB at crossover; LP + HP = 0 dB (flat sum).
    sos_low  = scipy_signal.butter(order // 2, norm_freq, btype="low",  output="sos")
    sos_high = scipy_signal.butter(order // 2, norm_freq, btype="high", output="sos")

    if audio.ndim == 2:
        low  = np.stack([scipy_signal.sosfilt(sos_low,  scipy_signal.sosfilt(sos_low,  ch)).astype(np.float32) for ch in audio])
        high = np.stack([scipy_signal.sosfilt(sos_high, scipy_signal.sosfilt(sos_high, ch)).astype(np.float32) for ch in audio])
    else:
        low  = scipy_signal.sosfilt(sos_low,  scipy_signal.sosfilt(sos_low,  audio)).astype(np.float32)
        high = scipy_signal.sosfilt(sos_high, scipy_signal.sosfilt(sos_high, audio)).astype(np.float32)

    return low, high


def compress_band(audio: np.ndarray, sr: int, threshold_db: float, ratio: float,
                  attack_ms: float = 20, release_ms: float = 100) -> np.ndarray:
    """Stereo-linked compressor using scipy IIR envelope follower.
    Linked detection: max(L, R) drives both channels simultaneously
    to prevent stereo-image pumping.
    """
    threshold = db_to_linear(threshold_db)
    attack_coeff  = np.exp(-1.0 / (sr * attack_ms  / 1000))
    release_coeff = np.exp(-1.0 / (sr * release_ms / 1000))

    # Linked stereo: single envelope from the louder channel
    if audio.ndim == 2:
        level = np.max(np.abs(audio), axis=0).astype(np.float32)
    else:
        level = np.abs(audio).astype(np.float32)

    b_att = np.array([1.0 - attack_coeff],  dtype=np.float64)
    a_att = np.array([1.0, -attack_coeff],  dtype=np.float64)
    b_rel = np.array([1.0 - release_coeff], dtype=np.float64)
    a_rel = np.array([1.0, -release_coeff], dtype=np.float64)

    # First-order IIR: lfilter is fine here (no numerical instability at order 1)
    env_att = scipy_signal.lfilter(b_att, a_att, level.astype(np.float64)).astype(np.float32)
    env_rel = scipy_signal.lfilter(b_rel, a_rel, level.astype(np.float64)).astype(np.float32)
    del level

    rising   = np.diff(env_att, prepend=env_att[0]) >= 0
    envelope = np.where(rising, env_att, env_rel).astype(np.float32)
    del env_att, env_rel, rising

    gain = np.ones(len(envelope), dtype=np.float32)
    over = envelope > threshold
    if np.any(over):
        gain[over] = (threshold * (envelope[over] / threshold) ** (1.0 / ratio)
                      / envelope[over])
    del envelope, over

    return (audio * gain).astype(np.float32)


def apply_multiband_compression(audio: np.ndarray, sr: int, params: MasteringParams) -> np.ndarray:
    """4-band multiband compression – frees intermediate arrays to keep RAM low."""
    import gc

    sub,  rest1 = linkwitz_riley_crossover(audio, sr, 80)
    low,  rest2 = linkwitz_riley_crossover(rest1, sr, 500)
    del rest1; gc.collect()
    mid,  high  = linkwitz_riley_crossover(rest2, sr, 5000)
    del rest2; gc.collect()

    # Use params for sub (fully parametric).
    # Low/Mid/High: derive attack from AI ratio — tighter ratio → faster attack
    # so transients are preserved more on gentler settings.
    def _band_atk(base_ms: float, ratio: float) -> float:
        return max(5.0, base_ms * (2.0 / max(ratio, 1.0)))
    def _band_rel(base_ms: float, ratio: float) -> float:
        return max(40.0, base_ms * (2.0 / max(ratio, 1.0)))

    sub_c = compress_band(sub, sr, params.mb_sub_threshold, params.mb_sub_ratio, params.mb_sub_attack, params.mb_sub_release)
    del sub; gc.collect()
    low_c = compress_band(low, sr, params.mb_low_threshold, params.mb_low_ratio,
                          _band_atk(30, params.mb_low_ratio), _band_rel(120, params.mb_low_ratio))
    del low; gc.collect()
    mid_c = compress_band(mid, sr, params.mb_mid_threshold, params.mb_mid_ratio,
                          _band_atk(15, params.mb_mid_ratio), _band_rel(80, params.mb_mid_ratio))
    del mid; gc.collect()
    high_c = compress_band(high, sr, params.mb_high_threshold, params.mb_high_ratio,
                           _band_atk(8, params.mb_high_ratio), _band_rel(40, params.mb_high_ratio))
    del high; gc.collect()

    result = (sub_c + low_c + mid_c + high_c).astype(np.float32)
    del sub_c, low_c, mid_c, high_c
    return result


# ─── 4b. DE-ESSER ───────────────────────────────────────────────────────────

def apply_deesser(audio: np.ndarray, sr: int,
                   low_hz: float = 4000, high_hz: float = 9000,
                   threshold_db: float = -18.0, ratio: float = 2.5) -> np.ndarray:
    """Frequency-selective de-essing: splits out the sibilance band
    (4-9 kHz by default) with the same phase-accurate LR4 crossover used for
    multiband compression, runs a fast/low-threshold compressor on just that
    band, and recombines. A clean, non-sibilant source barely crosses the
    threshold and passes through effectively untouched — this is deliberately
    conservative rather than genre-gated, since sibilance is content-, not
    genre-, dependent.
    """
    was_mono = audio.ndim != 2
    stereo = audio.reshape(1, -1) if was_mono else audio

    below, above_low = linkwitz_riley_crossover(stereo, sr, low_hz)
    sibilance, above_high = linkwitz_riley_crossover(above_low, sr, high_hz)
    del above_low

    sibilance_c = compress_band(sibilance, sr, threshold_db, ratio, attack_ms=2.0, release_ms=60.0)
    del sibilance

    result = (below + sibilance_c + above_high).astype(np.float32)
    return result[0] if was_mono else result


# ─── 6. MID/SIDE PROCESSING ────────────────────────────────────────────────────

def encode_ms(left: np.ndarray, right: np.ndarray):
    mid  = (left + right) / np.sqrt(2)
    side = (left - right) / np.sqrt(2)
    return mid, side


def decode_ms(mid: np.ndarray, side: np.ndarray):
    left  = (mid + side) / np.sqrt(2)
    right = (mid - side) / np.sqrt(2)
    return left, right


def apply_ms_processing(audio: np.ndarray, sr: int, params: MasteringParams) -> np.ndarray:
    """Mid/Side processing with mono-below-120Hz."""
    if audio.ndim != 2:
        return audio

    left, right = audio[0], audio[1]
    mid, side = encode_ms(left, right)

    # Apply stereo width to side channel
    side *= params.stereo_width

    # Mono below 120 Hz (cut side below 120Hz)
    nyq = sr / 2
    sos_high = scipy_signal.butter(4, 120 / nyq, btype="high", output="sos")
    side = scipy_signal.sosfilt(sos_high, side).astype(np.float32)

    left_out, right_out = decode_ms(mid, side)

    return np.stack([left_out, right_out])


# ─── 8. SATURATION / HARMONIC EXCITER ──────────────────────────────────────────

def soft_clip(x: np.ndarray, drive: float = 1.0) -> np.ndarray:
    """Soft tape saturation via tanh."""
    return np.tanh(x * (1 + drive * 2)) / (1 + drive * 2)


def apply_saturation(audio: np.ndarray, sr: int, amount: float) -> np.ndarray:
    """Subtle tape saturation on mid-lows with 2× oversampling to suppress aliasing.
    Oversampling pushes tanh-generated harmonics above the new Nyquist (sr Hz)
    where resample_poly's anti-alias FIR removes them before downsampling.
    """
    if amount < 0.01:
        return audio

    # 2× upsample before nonlinearity (axis=-1 = time axis for [ch, samples] arrays)
    audio_up = scipy_signal.resample_poly(audio, 2, 1, axis=-1).astype(np.float32)
    nyq_up   = sr  # Nyquist at 2× original sr

    sos_low  = scipy_signal.butter(4, 5000 / nyq_up, btype="low",  output="sos")
    sos_high = scipy_signal.butter(4, 5000 / nyq_up, btype="high", output="sos")

    if audio_up.ndim == 2:
        result = np.zeros_like(audio_up)
        for i in range(2):
            low_part  = scipy_signal.sosfilt(sos_low,  audio_up[i])
            high_part = scipy_signal.sosfilt(sos_high, audio_up[i])
            result[i] = (soft_clip(low_part, drive=amount) + high_part).astype(np.float32)
    else:
        low_part  = scipy_signal.sosfilt(sos_low,  audio_up)
        high_part = scipy_signal.sosfilt(sos_high, audio_up)
        result = (soft_clip(low_part, drive=amount) + high_part).astype(np.float32)

    # 2× downsample — resample_poly includes built-in anti-aliasing FIR
    result = scipy_signal.resample_poly(result, 1, 2, axis=-1).astype(np.float32)
    # Trim to original length (resample_poly may produce ±1 sample)
    if audio.ndim == 2:
        result = result[:, :audio.shape[1]]
    else:
        result = result[:audio.shape[0]]
    return result


# ─── 10. BUS COMPRESSION ───────────────────────────────────────────────────────

def apply_bus_compression(audio: np.ndarray, sr: int, params: MasteringParams) -> np.ndarray:
    """Stereo bus compressor — glue compression (2:1, slow attack)."""
    return compress_band(audio, sr,
                         params.bus_comp_threshold,
                         params.bus_comp_ratio,
                         attack_ms=50.0,
                         release_ms=100.0)


# ─── 11. LIMITING ──────────────────────────────────────────────────────────────

def _true_peak_envelope_chunk(audio: np.ndarray, oversample: int = 4) -> np.ndarray:
    """Per-sample true-peak envelope via 4x oversampling (ITU-R BS.1770-4 method)
    for a single chunk of audio. See `_true_peak_envelope` for the blocked
    wrapper that keeps memory bounded on long tracks.

    Sample-peak detection (plain max(abs(x))) misses inter-sample peaks that
    occur between two adjacent samples of the reconstructed analog waveform.
    Those peaks are inaudible in the PCM/WAV file itself but can clip after
    lossy re-encoding (MP3/AAC), whose decoder reconstructs the same
    inter-sample overshoot. Oversampling approximates that reconstructed
    waveform so the limiter can catch — and duck — those overs before export.
    """
    if audio.ndim == 2:
        up = scipy_signal.resample_poly(audio, oversample, 1, axis=-1).astype(np.float32)
        peak_up = np.max(np.abs(up), axis=0)
    else:
        up = scipy_signal.resample_poly(audio, oversample, 1).astype(np.float32)
        peak_up = np.abs(up).astype(np.float32)
    del up

    n = audio.shape[-1]
    usable = (len(peak_up) // oversample) * oversample
    # Max over each block of `oversample` interpolated points = true peak
    # for the original sample at that block's position.
    peak_per_sample = peak_up[:usable].reshape(-1, oversample).max(axis=1)
    del peak_up

    if len(peak_per_sample) < n:
        peak_per_sample = np.pad(peak_per_sample, (0, n - len(peak_per_sample)), mode="edge")
    else:
        peak_per_sample = peak_per_sample[:n]
    return peak_per_sample.astype(np.float32)


def _true_peak_envelope(audio: np.ndarray, sr: int, oversample: int = 4,
                         block_sec: float = 30.0, overlap_sec: float = 0.05) -> np.ndarray:
    """Blocked true-peak envelope — bounds peak memory usage on long files
    (podcasts, DJ sets) by 4x-oversampling ~30s at a time instead of the
    whole track at once. Each block is computed with a small overlap on
    both sides (overlap-save style) so the resample filter's edge effects
    are trimmed away rather than causing seams at block boundaries.
    """
    n = audio.shape[-1]
    block = int(block_sec * sr)
    overlap = int(overlap_sec * sr)

    if n <= block + 2 * overlap:
        return _true_peak_envelope_chunk(audio, oversample)

    out = np.empty(n, dtype=np.float32)
    pos = 0
    while pos < n:
        start = max(0, pos - overlap)
        end = min(n, pos + block + overlap)
        chunk = audio[..., start:end]
        chunk_peak = _true_peak_envelope_chunk(chunk, oversample)

        valid_start = pos - start
        valid_len = min(block, n - pos)
        out[pos:pos + valid_len] = chunk_peak[valid_start:valid_start + valid_len]

        pos += block
    return out


def _limit_to_ceiling(audio: np.ndarray, sr: int, ceiling_db: float) -> np.ndarray:
    """True-peak ceiling limiting only (no LUFS normalization) — lookahead
    gain-reduction + hard safety clip. Factored out of apply_true_peak_limiter()
    so it can be re-run for the loudness-correction passes below without
    re-measuring/re-applying the initial LUFS gain each time.
    """
    ceiling_lin = db_to_linear(ceiling_db)

    # ── True-peak envelope (4x oversampled) ──────────────────────────────────
    peak_sig = _true_peak_envelope(audio, sr, oversample=4)

    # ── 5 ms forward lookahead with scipy (O(n), no Python loop) ────────────
    lookahead = max(1, int(sr * 0.005))  # 5 ms in samples
    # maximum_filter1d with a left-shifted origin sees future samples
    peak_ahead = maximum_filter1d(peak_sig, size=lookahead + 1, origin=-(lookahead // 2))

    # Desired gain at each sample (≤ 1.0)
    desired_gain = np.where(
        peak_ahead > ceiling_lin,
        ceiling_lin / np.maximum(peak_ahead, 1e-8),
        1.0,
    ).astype(np.float32)

    # ── Smooth gain at ~1 kHz (instant attack / IIR release) ────────────────
    # Gain dynamics live at the release timescale (50 ms), not per-sample.
    # Downsampling reduces the Python loop from ~10 M to ~240 iterations
    # for a 4-minute track at 44.1 kHz — a ~44× speedup with no audible loss.
    n_full = len(desired_gain)
    ds     = max(1, sr // 1000)      # downsample factor (≈ 44 at 44.1 kHz)
    n_ds   = n_full // ds

    # Peak-hold downsample: worst-case (minimum) gain per block
    gain_ds = desired_gain[:n_ds * ds].reshape(n_ds, ds).min(axis=1)

    sr_ds      = sr / ds
    release_ds = float(np.exp(-1.0 / (sr_ds * 0.05)))  # 50 ms τ at ds rate
    smoothed_ds = np.empty(n_ds, dtype=np.float64)
    g = 1.0
    for i in range(n_ds):
        d = float(gain_ds[i])
        if d < g:
            g = d                                          # instant attack
        else:
            g = release_ds * g + (1.0 - release_ds) * d  # IIR release
        smoothed_ds[i] = g

    # ── Upsample gain to full rate (linear interpolation) ────────────────────
    xs_ds   = np.arange(n_ds, dtype=np.float64) * ds + ds * 0.5
    xs_full = np.arange(n_full, dtype=np.float64)
    smoothed = np.interp(xs_full, xs_ds, smoothed_ds).astype(np.float32)

    # ── Apply gain + hard safety clip ─────────────────────────────────────────
    audio = (audio * smoothed).astype(np.float32)
    np.clip(audio, -ceiling_lin, ceiling_lin, out=audio)
    return audio


def apply_true_peak_limiter(audio: np.ndarray, sr: int, ceiling_db: float, target_lufs: float) -> np.ndarray:
    """
    True Peak limiter with proper lookahead + smooth attack/release.

    Pipeline:
      1. LUFS normalization (ITU-R BS.1770-4 via pyloudnorm)
      2. True-peak detection via 4x oversampling + 5 ms forward lookahead
      3. Smooth gain reduction: instant attack, 50 ms release (IIR)
      4. Hard safety clip as final guard
      5. Up to 2 loudness-correction passes: re-measure the achieved LUFS after
         limiting (which only ever reduces level, so dense/hot masters can land
         below target) and nudge back up + re-limit, so the delivered loudness
         actually lands near the platform target instead of silently under it.
    """
    meter = pyln.Meter(sr)

    # ── 1. LUFS normalization ────────────────────────────────────────────────
    lufs_in = audio.T if audio.ndim == 2 else audio.reshape(-1, 1)
    current_lufs = meter.integrated_loudness(lufs_in)
    if np.isfinite(current_lufs):
        audio = audio * db_to_linear(target_lufs - current_lufs)

    audio = _limit_to_ceiling(audio, sr, ceiling_db)

    # ── Loudness-correction passes ───────────────────────────────────────────
    for _ in range(2):
        lufs_in = audio.T if audio.ndim == 2 else audio.reshape(-1, 1)
        achieved_lufs = meter.integrated_loudness(lufs_in)
        if not np.isfinite(achieved_lufs):
            break
        undershoot = target_lufs - achieved_lufs
        if undershoot <= 0.3:
            break  # close enough (or already at/above target)
        # Damped, bounded nudge — re-limiting will re-catch any new peak overs
        # this reintroduces, so this converges rather than overshooting.
        trim_db = min(undershoot * 0.9, 3.0)
        audio = audio * db_to_linear(trim_db)
        audio = _limit_to_ceiling(audio, sr, ceiling_db)

    return audio


# ─── 12. OUTPUT STAGE ──────────────────────────────────────────────────────────

@jit(nopython=True, cache=True)
def _noise_shape_channel(x: np.ndarray, step: np.float32, tpdf: np.ndarray) -> np.ndarray:
    """2nd-order error-feedback noise shaping (numba-compiled — a plain Python
    per-sample loop would be far too slow here, ~10M+ samples per channel).
    Classic delta-sigma-style shaper: u[n] = x[n] - (2*e[n-1] - e[n-2]),
    quantize, feed the (always-bounded, |e| <= step/2) error back. Pushes
    quantization noise away from the most audible ~2-5 kHz range instead of
    leaving it flat, like plain TPDF dither does.
    """
    n = x.shape[0]
    out = np.empty(n, dtype=np.float32)
    e1 = np.float32(0.0)
    e2 = np.float32(0.0)
    for i in range(n):
        u = x[i] - (np.float32(2.0) * e1 - e2)
        dithered = u + tpdf[i]
        q = np.round(dithered / step) * step
        err = dithered - q
        e2 = e1
        e1 = err
        out[i] = q
    return out


def apply_dither(audio: np.ndarray, target_bit_depth: int = 16) -> np.ndarray:
    """Noise-shaped TPDF dither for bit-depth reduction (see _noise_shape_channel)."""
    if target_bit_depth >= 24:
        return audio  # No dither needed for high bit depth

    step = np.float32(1.0 / (2 ** (target_bit_depth - 1)))

    def shape(ch: np.ndarray) -> np.ndarray:
        ch = ch.astype(np.float32)
        # TPDF = difference of two uniform distributions, ±1 LSB
        tpdf = (step * (np.random.uniform(size=ch.shape) - np.random.uniform(size=ch.shape))).astype(np.float32)
        return _noise_shape_channel(ch, step, tpdf)

    if audio.ndim == 2:
        return np.stack([shape(audio[0]), shape(audio[1])])
    return shape(audio)


def export_formats(audio: np.ndarray, sr: int, output_dir: str, master_id: str, selected_format: str = "mp3128") -> dict:
    """Export only the selected format (plus mp3128 as preview fallback)."""
    os.makedirs(output_dir, exist_ok=True)
    paths = {}

    # Always produce mp3128 as a free preview fallback
    formats_to_render = {selected_format, "mp3128"}

    # WAV formats (soundfile)
    if "wav32" in formats_to_render:
        p = os.path.join(output_dir, f"{master_id}_wav32.wav")
        sf.write(p, audio.T if audio.ndim == 2 else audio, sr, subtype="FLOAT")
        paths["wav32"] = p

    if "wav24" in formats_to_render:
        p = os.path.join(output_dir, f"{master_id}_wav24.wav")
        sf.write(p, audio.T if audio.ndim == 2 else audio, sr, subtype="PCM_24")
        paths["wav24"] = p

    if "wav16" in formats_to_render:
        audio16 = apply_dither(audio, 16)
        p = os.path.join(output_dir, f"{master_id}_wav16.wav")
        sf.write(p, audio16.T if audio16.ndim == 2 else audio16, sr, subtype="PCM_16")
        paths["wav16"] = p

    if "flac" in formats_to_render:
        p = os.path.join(output_dir, f"{master_id}_flac.flac")
        sf.write(p, audio.T if audio.ndim == 2 else audio, sr, format="FLAC", subtype="PCM_24")
        paths["flac"] = p

    # FFmpeg formats (mp3/aac)
    need_ffmpeg = formats_to_render & {"mp3320", "mp3128", "aac256"}
    if need_ffmpeg:
        try:
            import ffmpeg
            tmp_wav = os.path.join(output_dir, f"{master_id}_tmp.wav")
            sf.write(tmp_wav, audio.T if audio.ndim == 2 else audio, sr, subtype="PCM_24")

            if "mp3320" in need_ffmpeg:
                p = os.path.join(output_dir, f"{master_id}_mp3320.mp3")
                ffmpeg.input(tmp_wav).output(p, audio_bitrate="320k", acodec="libmp3lame").overwrite_output().run(quiet=True)
                paths["mp3320"] = p

            if "mp3128" in need_ffmpeg:
                p = os.path.join(output_dir, f"{master_id}_mp3128.mp3")
                ffmpeg.input(tmp_wav).output(p, audio_bitrate="128k", acodec="libmp3lame").overwrite_output().run(quiet=True)
                paths["mp3128"] = p

            if "aac256" in need_ffmpeg:
                p = os.path.join(output_dir, f"{master_id}_aac256.m4a")
                ffmpeg.input(tmp_wav).output(p, audio_bitrate="256k", acodec="aac").overwrite_output().run(quiet=True)
                paths["aac256"] = p

            os.remove(tmp_wav)
        except Exception as e:
            print(f"FFmpeg export error: {e}")
            # Fallback: WAV 24-bit copy
            fallback = os.path.join(output_dir, f"{master_id}_wav24.wav")
            if not os.path.exists(fallback):
                sf.write(fallback, audio.T if audio.ndim == 2 else audio, sr, subtype="PCM_24")
            for fmt in need_ffmpeg:
                paths[fmt] = fallback

    return paths


# ─── FAST POST-ANALYSIS (in-memory, no librosa BPM/key re-run) ────────────────

def _quick_post_analysis(audio: np.ndarray, sr: int, params: "MasteringParams",
                          pre_bpm: float = 0.0, pre_key: str = "Unknown") -> dict:
    """Compute only loudness/dynamics/spectral on the mastered numpy array.
    BPM and key are copied from params (they don't change after mastering).
    This avoids a second slow librosa.load + beat_track call (~30-60s).
    """
    import math

    mono = audio[0] if audio.ndim == 2 else audio
    left = audio[0] if audio.ndim == 2 else audio
    right = audio[1] if audio.ndim == 2 else audio
    is_stereo = audio.ndim == 2

    def safe(v, default=0.0):
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            return default
        return float(v)

    # Integrated LUFS
    meter = pyln.Meter(sr)
    lufs_in = np.stack([left, right], axis=1) if is_stereo else mono.reshape(-1, 1)
    try:
        integrated_lufs = safe(meter.integrated_loudness(lufs_in), -70.0)
    except Exception:
        integrated_lufs = -70.0

    # True peak
    peak = float(np.max(np.abs(mono)))
    true_peak = safe(20 * np.log10(peak) if peak > 1e-10 else -120.0, -120.0)

    # DR / crest
    rms_total = float(np.sqrt(np.mean(mono ** 2)))
    crest_factor = safe(20 * np.log10(peak / max(rms_total, 1e-10)), 0.0)
    dr_value = safe(compute_dr(mono), 0.0)
    lra_value = safe(compute_lra(audio, sr), 0.0)

    # Per-band RMS
    rms_sub  = safe(rms_band(mono, sr,    20,    80), -80.0)
    rms_low  = safe(rms_band(mono, sr,    80,   500), -80.0)
    rms_mid  = safe(rms_band(mono, sr,   500,  5000), -80.0)
    rms_high = safe(rms_band(mono, sr,  5000, 12000), -80.0)
    rms_air  = safe(rms_band(mono, sr, 12000, 20000), -80.0)

    # Spectral (fast numpy, no librosa)
    fft = np.abs(np.fft.rfft(mono[:min(len(mono), sr * 5)]))  # max 5s for speed
    freqs = np.fft.rfftfreq(min(len(mono), sr * 5), 1 / sr)
    fft_sum = np.sum(fft) or 1.0
    spectral_centroid = safe(float(np.sum(freqs * fft) / fft_sum), 0.0)
    cumsum = np.cumsum(fft)
    rolloff_idx = np.searchsorted(cumsum, 0.85 * cumsum[-1])
    spectral_rolloff = safe(float(freqs[min(rolloff_idx, len(freqs) - 1)]), 0.0)
    spectral_flatness = safe(float(
        np.exp(np.mean(np.log(fft + 1e-10))) / (np.mean(fft) + 1e-10)
    ), 0.0)

    # Stereo
    if is_stereo:
        mid_s  = (left + right) / 2
        side_s = (left - right) / 2
        stereo_width = safe(
            float(np.sqrt(np.mean(side_s ** 2)) / max(np.sqrt(np.mean(mid_s ** 2)), 1e-10)), 0.0
        )
        mono_compat = safe(
            float(np.corrcoef(left, right)[0, 1]) if np.std(left) > 0 and np.std(right) > 0 else 1.0,
            1.0
        )
    else:
        stereo_width = 0.0
        mono_compat  = 1.0

    duration = float(len(mono) / sr)

    return {
        "integrated_lufs":    integrated_lufs,
        "true_peak":          true_peak,
        "dr_value":           dr_value,
        "crest_factor":       crest_factor,
        "lra":                lra_value,
        "rms_sub":            rms_sub,
        "rms_low":            rms_low,
        "rms_mid":            rms_mid,
        "rms_high":           rms_high,
        "rms_air":            rms_air,
        "spectral_centroid":  spectral_centroid,
        "spectral_rolloff":   spectral_rolloff,
        "spectral_flatness":  spectral_flatness,
        "stereo_width":       stereo_width,
        "mono_compatibility": mono_compat,
        "bpm":                safe(pre_bpm, 0.0),
        "key":                pre_key,
        "transient_density":  0.0,
        "clipping_detected":  bool(np.any(np.abs(mono) > 0.99)),
        "dc_offset":          safe(float(np.mean(mono)), 0.0),
        "duration_seconds":   duration,
        "sample_rate":        int(sr),
        "bit_depth":          24,
        "channels":           2 if is_stereo else 1,
    }


# ─── MAIN MASTERING FUNCTION ───────────────────────────────────────────────────

def master_audio(
    file_path: str,
    params: MasteringParams,
    output_dir: str,
    progress_callback: Optional[Callable[[str, int], None]] = None,
    selected_format: str = "mp3128",
    pre_analysis: Optional[dict] = None,
    master_id: Optional[str] = None,
) -> MasteringResult:
    """Execute the full mastering chain."""

    def emit(step: str, progress: int):
        if progress_callback:
            progress_callback(step, progress)

    # Named "loading" (not "analyzing") — the caller already ran analyze_audio()
    # for the pre-analysis metrics; this is just the raw-sample reload needed for
    # processing. A distinct name keeps the progress stream monotonic instead of
    # jumping back to an earlier-looking stage after the caller's own "analyzing"
    # step.
    emit("loading", 19)

    # 1. Load audio
    audio, sr = librosa.load(file_path, sr=None, mono=False)
    if audio.ndim == 1:
        audio = np.stack([audio, audio])  # Mono to stereo

    # 1b. Remove DC offset
    audio = remove_dc_simple(audio)

    # 1c. Gain-stage to a fixed reference loudness so the absolute-dB thresholds
    # below behave consistently regardless of how loud the source was delivered.
    audio = normalize_to_reference_lufs(audio, sr)

    emit("eq", 20)

    # 4. Correction EQ
    audio = apply_correction_eq(audio, sr, params)

    # 4b. De-esser (before multiband compression exaggerates any sibilance further)
    audio = apply_deesser(audio, sr)

    emit("compression", 38)

    # 5. Multiband compression
    audio = apply_multiband_compression(audio, sr, params)

    emit("ms", 52)

    # 6. M/S processing
    audio = apply_ms_processing(audio, sr, params)

    emit("saturation", 65)

    # 8. Saturation
    audio = apply_saturation(audio, sr, params.saturation_amount)

    # 9. Final EQ (gentle air shelf — only when mix is thin above 12 kHz)
    air_rms = float(pre_analysis.get("rms_air", -80.0)) if pre_analysis else -80.0
    if air_rms < -26.0:
        final_board = Pedalboard([
            HighShelfFilter(cutoff_frequency_hz=12000, gain_db=0.8, q=0.707),
        ])
        audio = np.stack([
            final_board(audio[0:1].T, sr).T[0],
            final_board(audio[1:2].T, sr).T[0],
        ])

    emit("limiting", 74)

    # 10. Bus compression
    audio = apply_bus_compression(audio, sr, params)

    # 11. True Peak limiting + LUFS normalization
    audio = apply_true_peak_limiter(audio, sr, params.true_peak_ceiling, params.target_lufs)

    emit("rendering", 88)

    # 12. Export all formats — use provided master_id or generate a fallback UUID
    if not master_id:
        master_id = str(uuid.uuid4())
    paths = export_formats(audio, sr, output_dir, master_id, selected_format)

    # Post-analysis — lightweight in-memory measurement (skip BPM/key, they don't change)
    pre_bpm = float(pre_analysis.get("bpm", 0.0)) if pre_analysis else 0.0
    pre_key = str(pre_analysis.get("key", "Unknown")) if pre_analysis else "Unknown"
    post_analysis = _quick_post_analysis(audio, sr, params, pre_bpm, pre_key)

    emit("complete", 100)

    return MasteringResult(
        master_id=master_id,
        paths=paths,
        post_analysis=post_analysis,
        notes=params.notes,
    )
