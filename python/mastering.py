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
import logging
from dataclasses import dataclass
from typing import Callable, Optional

from ai_params import MasteringParams
from analyzer import compute_dr, rms_band, compute_lra, compute_true_peak

logger = logging.getLogger("beatzucker.mastering")


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


@jit(nopython=True, cache=True)
def _follow_envelope(level: np.ndarray, attack_coeff: float,
                     release_coeff: float) -> np.ndarray:
    """Stateful attack/release envelope follower.

    A single state is essential here: independently filtering attack and
    release envelopes and switching between them creates discontinuities and
    does not model a compressor detector.
    """
    envelope = np.empty(len(level), dtype=np.float32)
    state = 0.0
    for i in range(len(level)):
        coeff = attack_coeff if level[i] > state else release_coeff
        state = coeff * state + (1.0 - coeff) * level[i]
        envelope[i] = state
    return envelope


def compress_band(audio: np.ndarray, sr: int, threshold_db: float, ratio: float,
                  attack_ms: float = 20, release_ms: float = 100,
                  max_reduction_db: float = 4.0) -> np.ndarray:
    """Stereo-linked feed-forward compressor with bounded gain reduction.

    The louder channel drives one stateful detector for both channels, which
    prevents stereo-image movement. The reduction cap is a mastering-quality
    guardrail: an unusual upload or aggressive manual setting cannot silently
    turn a subtle stage into broadband crushing.
    """
    if ratio <= 1.0001 or max_reduction_db <= 0:
        return audio.astype(np.float32, copy=True)

    threshold = db_to_linear(threshold_db)
    attack_coeff = float(np.exp(-1.0 / max(1.0, sr * attack_ms / 1000)))
    release_coeff = float(np.exp(-1.0 / max(1.0, sr * release_ms / 1000)))

    # Linked stereo: single envelope from the louder channel
    if audio.ndim == 2:
        level = np.max(np.abs(audio), axis=0).astype(np.float32)
    else:
        level = np.abs(audio).astype(np.float32)

    envelope = _follow_envelope(level, attack_coeff, release_coeff)
    del level

    gain = np.ones(len(envelope), dtype=np.float32)
    over = envelope > threshold
    if np.any(over):
        gain[over] = (threshold * (envelope[over] / threshold) ** (1.0 / ratio)
                      / envelope[over])
        np.maximum(gain, db_to_linear(-abs(max_reduction_db)), out=gain)
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

    sub_c = compress_band(sub, sr, params.mb_sub_threshold, params.mb_sub_ratio,
                          params.mb_sub_attack, params.mb_sub_release,
                          max_reduction_db=4.0)
    del sub; gc.collect()
    low_c = compress_band(low, sr, params.mb_low_threshold, params.mb_low_ratio,
                          _band_atk(30, params.mb_low_ratio), _band_rel(120, params.mb_low_ratio),
                          max_reduction_db=3.5)
    del low; gc.collect()
    mid_c = compress_band(mid, sr, params.mb_mid_threshold, params.mb_mid_ratio,
                          _band_atk(15, params.mb_mid_ratio), _band_rel(80, params.mb_mid_ratio),
                          max_reduction_db=3.0)
    del mid; gc.collect()
    high_c = compress_band(high, sr, params.mb_high_threshold, params.mb_high_ratio,
                           _band_atk(8, params.mb_high_ratio), _band_rel(40, params.mb_high_ratio),
                           max_reduction_db=2.5)
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

    sibilance_c = compress_band(sibilance, sr, threshold_db, ratio,
                                attack_ms=2.0, release_ms=60.0,
                                max_reduction_db=3.0)
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
    # Complementary LR4 split: when amount tends to zero, both bands recombine
    # flat. Independent Butterworth LP/HP filters did not guarantee this and
    # could colour the signal even before the nonlinear processing.
    low_part, high_part = linkwitz_riley_crossover(audio_up, sr * 2, 5000)
    result = (soft_clip(low_part, drive=amount) + high_part).astype(np.float32)
    del low_part, high_part

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
                         release_ms=100.0,
                         max_reduction_db=2.0)


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

    if n_ds == 0:
        # Very short diagnostic/test signals: avoid empty interpolation arrays.
        reduction = float(np.min(desired_gain)) if n_full else 1.0
        return (audio * reduction).astype(np.float32)

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

    # ── Apply gain + sample-domain safety guard ───────────────────────────────
    audio = (audio * smoothed).astype(np.float32)
    np.clip(audio, -ceiling_lin, ceiling_lin, out=audio)

    # Interpolation/smoothing can leave a small reconstructed-signal overshoot.
    # A final global trim preserves waveform shape and guarantees the requested
    # true-peak ceiling without adding a second hard-clipping stage.
    final_envelope = _true_peak_envelope(audio, sr, oversample=4)
    final_peak = float(np.max(final_envelope)) if len(final_envelope) else 0.0
    if final_peak > ceiling_lin:
        audio *= np.float32(ceiling_lin / max(final_peak, 1e-12))
    return audio


def apply_true_peak_limiter(audio: np.ndarray, sr: int, ceiling_db: float,
                            target_lufs: float,
                            max_gain_reduction_db: float = 4.0) -> np.ndarray:
    """
    True Peak limiter with proper lookahead + smooth attack/release.

    Pipeline:
      1. LUFS normalization (ITU-R BS.1770-4 via pyloudnorm)
      2. True-peak detection via 4x oversampling + 5 ms forward lookahead
      3. Smooth gain reduction: instant attack, 50 ms release (IIR)
      4. Hard safety clip as final guard
      5. A maximum-gain-reduction guardrail. If loudness and dynamics conflict,
         the result may land below the nominal LUFS target instead of being
         repeatedly driven into the limiter.
    """
    meter = pyln.Meter(sr)

    # ── 1. LUFS normalization ────────────────────────────────────────────────
    lufs_in = audio.T if audio.ndim == 2 else audio.reshape(-1, 1)
    current_lufs = meter.integrated_loudness(lufs_in)
    loudness_constrained = False
    if np.isfinite(current_lufs):
        requested_gain_db = target_lufs - current_lufs
        peak_envelope = _true_peak_envelope(audio, sr, oversample=4)
        current_tp_lin = float(np.max(peak_envelope)) if len(peak_envelope) else 0.0
        current_tp_db = linear_to_db(max(current_tp_lin, 1e-12))

        # The normalization gain may ask the limiter for at most the configured
        # amount of peak reduction. This makes the loudness target a goal rather
        # than an unconditional order to destroy transients.
        max_gain_db = ceiling_db - current_tp_db + abs(max_gain_reduction_db)
        applied_gain_db = min(requested_gain_db, max_gain_db)
        loudness_constrained = applied_gain_db < requested_gain_db - 0.05
        audio = audio * db_to_linear(applied_gain_db)

    audio = _limit_to_ceiling(audio, sr, ceiling_db)

    # One small correction is useful when metering/limiting interaction causes
    # a benign miss. Never chase loudness when the dynamics guardrail engaged.
    for _ in range(0 if loudness_constrained else 1):
        lufs_in = audio.T if audio.ndim == 2 else audio.reshape(-1, 1)
        achieved_lufs = meter.integrated_loudness(lufs_in)
        if not np.isfinite(achieved_lufs):
            break
        undershoot = target_lufs - achieved_lufs
        if undershoot <= 0.3:
            break  # close enough (or already at/above target)
        # Damped, bounded nudge — re-limiting will re-catch any new peak overs
        # this reintroduces, so this converges rather than overshooting.
        trim_db = min(undershoot * 0.75, 0.75)
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
    """Export the selected format plus MP3 preview, without disguised fallbacks.

    A key in ``paths`` always denotes the codec/bit depth named by that key. If
    FFmpeg cannot create a requested lossy format, mastering fails explicitly
    instead of returning a WAV file under an MP3/AAC download label.
    """
    os.makedirs(output_dir, exist_ok=True)
    paths = {}

    # Produce the chosen delivery plus a high-quality browser preview. 128 kbps
    # is still available as an explicit delivery choice, but it is a poor basis
    # for a critical A/B decision: its low-pass and codec artefacts can be heard
    # as mastering differences. MP3 320 keeps the preview broadly compatible
    # while making the comparison much more representative of the PCM master.
    formats_to_render = {selected_format, "mp3320"}

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
        tmp_wav = os.path.join(output_dir, f"{master_id}_tmp.wav")
        try:
            import ffmpeg
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

        except Exception as e:
            # A missing preview is non-fatal when the paid/selected lossless
            # export itself succeeded. A selected lossy export must be honest.
            if selected_format in {"mp3320", "mp3128", "aac256"}:
                raise RuntimeError(f"Requested {selected_format} export failed") from e
        finally:
            if os.path.exists(tmp_wav):
                os.remove(tmp_wav)

    return paths


def load_and_verify_export(path: str, expected_format: str, expected_sr: int) -> tuple[np.ndarray, int]:
    """Decode the delivered file and reject missing, empty or mislabeled output."""
    if not path or not os.path.isfile(path) or os.path.getsize(path) == 0:
        raise RuntimeError(f"{expected_format} export is missing or empty")

    lossless_subtypes = {
        "wav32": {"FLOAT"},
        "wav24": {"PCM_24"},
        "wav16": {"PCM_16"},
        "flac": {"PCM_24"},
    }
    if expected_format in lossless_subtypes:
        info = sf.info(path)
        if info.samplerate != expected_sr or info.subtype not in lossless_subtypes[expected_format]:
            raise RuntimeError(
                f"{expected_format} verification failed: {info.samplerate} Hz/{info.subtype}"
            )
        decoded, decoded_sr = sf.read(path, always_2d=True, dtype="float32")
        audio = decoded.T
    else:
        # libsndfile handles MP3 on current deployments. AAC support varies, so
        # use the same FFmpeg installation as export as a deterministic fallback.
        try:
            audio, decoded_sr = librosa.load(path, sr=None, mono=False)
        except Exception:
            import ffmpeg
            verify_wav = f"{path}.verify.wav"
            try:
                ffmpeg.input(path).output(
                    verify_wav, format="wav", acodec="pcm_f32le"
                ).overwrite_output().run(quiet=True)
                decoded, decoded_sr = sf.read(verify_wav, always_2d=True, dtype="float32")
                audio = decoded.T
            finally:
                if os.path.exists(verify_wav):
                    os.remove(verify_wav)

    audio = np.asarray(audio, dtype=np.float32)
    if audio.size == 0 or not np.all(np.isfinite(audio)):
        raise RuntimeError(f"{expected_format} decoded to invalid audio")
    if int(decoded_sr) != int(expected_sr):
        raise RuntimeError(f"{expected_format} sample rate changed unexpectedly")
    return audio, int(decoded_sr)


# ─── FAST POST-ANALYSIS (in-memory, no librosa BPM/key re-run) ────────────────

def _quick_post_analysis(audio: np.ndarray, sr: int, params: "MasteringParams",
                          pre_bpm: float = 0.0, pre_key: str = "Unknown",
                          pre_transient_density: float = 0.0,
                          output_bit_depth: int = 0) -> dict:
    """Compute only loudness/dynamics/spectral on the mastered numpy array.
    BPM and key are copied from params (they don't change after mastering).
    This avoids a second slow librosa.load + beat_track call (~30-60s).

    WICHTIG: Alle Werte hier muessen mit DEMSELBEN Verfahren gemessen werden wie in
    analyzer.analyze_audio(), sonst ist die Vorher/Nachher-Gegenueberstellung im
    Mastering-Bericht wertlos — sie vergleicht dann zwei verschiedene Messgroessen
    statt zweier Zustaende desselben Signals.
    """
    import math

    is_stereo = audio.ndim == 2
    left = audio[0] if is_stereo else audio
    right = audio[1] if is_stereo else audio
    # Mono-Summe wie in analyze_audio() (dort librosa.to_mono, das ist genau dieser
    # Mittelwert). Vorher wurde hier nur der LINKE Kanal als "mono" verwendet — das
    # verfaelschte alle Band-RMS-, DR- und Clipping-Werte der Nachanalyse gegenueber
    # der Voranalyse.
    mono = np.mean(audio, axis=0).astype(np.float32) if is_stereo else audio

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

    # Sample peak for crest/DR, true peak separately across all channels.
    peak = float(np.max(np.abs(mono)))
    true_peak = safe(compute_true_peak(audio, sr, oversample=4), -120.0)

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

    # Spektralwerte mit DEMSELBEN Verfahren wie analyzer.analyze_audio():
    # librosa, ganzer Track, Mittel ueber alle Frames.
    # Vorher lief hier eine einzelne FFT ueber nur die ersten 5 Sekunden des linken
    # Kanals — ein voellig anderes Mass. An echtem Material ergab das im
    # Mastering-Bericht eine Abweichung von ~900 Hz beim Centroid, mit falschem
    # Vorzeichen: der Master wurde messbar heller (+512 Hz), angezeigt wurde aber
    # dunkler (-397 Hz). Kostet rund 3-4 s bei ~50 s Mastering-Laufzeit.
    try:
        spectral_centroid = safe(float(np.mean(
            librosa.feature.spectral_centroid(y=mono, sr=sr))), 0.0)
        spectral_rolloff = safe(float(np.mean(
            librosa.feature.spectral_rolloff(y=mono, sr=sr, roll_percent=0.85))), 0.0)
        spectral_flatness = safe(float(np.mean(
            librosa.feature.spectral_flatness(y=mono))), 0.0)
    except Exception:
        spectral_centroid = spectral_rolloff = spectral_flatness = 0.0

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
        "transient_density":  safe(pre_transient_density, 0.0),
        "clipping_detected":  bool(np.any(np.abs(audio) > 0.99)),
        "dc_offset":          safe(float(np.mean(mono)), 0.0),
        "duration_seconds":   duration,
        "sample_rate":        int(sr),
        "bit_depth":          int(output_bit_depth),
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
    source_info = sf.info(file_path)
    max_duration = float(os.environ.get("MAX_AUDIO_DURATION_SECONDS", "1800"))
    if source_info.channels not in (1, 2):
        raise ValueError("Only mono and stereo audio are supported")
    if source_info.duration <= 0 or source_info.duration > max_duration:
        raise ValueError(f"Audio duration must be between 0 and {max_duration:g} seconds")
    audio, sr = librosa.load(file_path, sr=None, mono=False)
    if audio.ndim == 1:
        audio = np.stack([audio, audio])  # Mono to stereo

    # 1b. Remove DC offset
    audio = remove_dc_simple(audio)

    intensity = max(0.0, min(1.0, params.processing_intensity / 100.0))

    # Gain-stage to a fixed reference so absolute detector thresholds behave
    # consistently. At exactly 0% all creative stages are bypassed; the output
    # limiter still performs platform normalization and ceiling protection.
    if intensity > 0.0:
        audio = normalize_to_reference_lufs(audio, sr)

    emit("eq", 20)

    if intensity > 0.0:
        # 4. Correction EQ
        audio = apply_correction_eq(audio, sr, params)

        # 4b. De-esser. Its ratio follows intensity instead of being a hidden,
        # fixed-strength processor at every setting.
        audio = apply_deesser(audio, sr, ratio=1.0 + 1.5 * intensity)

    emit("compression", 38)

    if intensity > 0.0:
        audio = apply_multiband_compression(audio, sr, params)

    emit("ms", 52)

    if intensity > 0.0:
        audio = apply_ms_processing(audio, sr, params)

    emit("saturation", 65)

    if intensity > 0.0:
        audio = apply_saturation(audio, sr, params.saturation_amount)

    # 9. Final EQ (gentle air shelf — only when mix is thin above 12 kHz)
    air_rms = float(pre_analysis.get("rms_air", -80.0)) if pre_analysis else -80.0
    if intensity > 0.0 and air_rms < -26.0:
        final_board = Pedalboard([
            HighShelfFilter(cutoff_frequency_hz=12000, gain_db=0.8 * intensity, q=0.707),
        ])
        audio = np.stack([
            final_board(audio[0:1].T, sr).T[0],
            final_board(audio[1:2].T, sr).T[0],
        ])

    emit("limiting", 74)

    if intensity > 0.0:
        audio = apply_bus_compression(audio, sr, params)

    # 11. True Peak limiting + LUFS normalization
    audio = apply_true_peak_limiter(audio, sr, params.true_peak_ceiling, params.target_lufs)

    emit("rendering", 88)

    # 12. Export the selected format plus preview; generate an ID only for direct calls.
    if not master_id:
        master_id = str(uuid.uuid4())
    paths = export_formats(audio, sr, output_dir, master_id, selected_format)

    selected_path = paths.get(selected_format)
    if not selected_path:
        raise RuntimeError(f"Selected {selected_format} export was not produced")

    # Decode what the user will actually download. Lossy codecs can create new
    # inter-sample overshoots even when the PCM feeding the encoder was safe.
    # Re-trim and render once when required, then report measurements from the
    # delivered codec rather than from an in-memory precursor.
    post_audio, post_sr = load_and_verify_export(selected_path, selected_format, sr)
    delivered_tp = compute_true_peak(post_audio, post_sr, oversample=4)
    if delivered_tp > params.true_peak_ceiling + 0.05:
        codec_trim_db = params.true_peak_ceiling - delivered_tp - 0.05
        audio = (audio * db_to_linear(codec_trim_db)).astype(np.float32)
        paths = export_formats(audio, sr, output_dir, master_id, selected_format)
        selected_path = paths.get(selected_format)
        if not selected_path:
            raise RuntimeError(f"Selected {selected_format} re-export was not produced")
        post_audio, post_sr = load_and_verify_export(selected_path, selected_format, sr)
        delivered_tp = compute_true_peak(post_audio, post_sr, oversample=4)
        params.notes += f" Codec safety trim: {codec_trim_db:.2f} dB."
        if delivered_tp > params.true_peak_ceiling + 0.1:
            raise RuntimeError(
                f"{selected_format} true peak remains above ceiling after safety render"
            )

    # Post-analysis — lightweight in-memory measurement (skip BPM/key, they don't change)
    pre_bpm = float(pre_analysis.get("bpm", 0.0)) if pre_analysis else 0.0
    pre_key = str(pre_analysis.get("key", "Unknown")) if pre_analysis else "Unknown"
    pre_transients = float(pre_analysis.get("transient_density", 0.0)) if pre_analysis else 0.0
    bit_depth_by_format = {"wav32": 32, "wav24": 24, "wav16": 16, "flac": 24}
    output_bit_depth = bit_depth_by_format.get(selected_format, 0)
    post_analysis = _quick_post_analysis(
        post_audio, post_sr, params, pre_bpm, pre_key, pre_transients, output_bit_depth
    )

    emit("complete", 100)

    return MasteringResult(
        master_id=master_id,
        paths=paths,
        post_analysis=post_analysis,
        notes=params.notes,
    )
