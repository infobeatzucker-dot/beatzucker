"""Conservative transient tonal control, stereo linked and cut-only.

Two constant-peak bandpasses feed a parallel subtraction path. A relative power
detector compares each region to its own two-second history; sustained timbre is
not an instruction to permanently darken a mix. No future samples or delay.
"""
import numpy as np
from numba import jit

REGIONS = ((280.0, 1.25), (3200.0, 1.4))


def coefficients(sr, frequency, q):
    w = 2 * np.pi * frequency / sr
    alpha = np.sin(w) / (2 * q)
    return np.array([alpha / (1 + alpha), 0.0, -alpha / (1 + alpha),
                     -2 * np.cos(w) / (1 + alpha), (1 - alpha) / (1 + alpha)])


@jit(nopython=True, cache=True)
def _process(audio, sr, amount, filters):
    output = audio.copy()
    fast = np.exp(-1.0 / (.02 * sr))
    history = np.exp(-1.0 / (2.0 * sr))
    attack = np.exp(-1.0 / (.04 * sr))
    release = np.exp(-1.0 / (.2 * sr))
    warmup = int(.25 * sr)
    for band in range(len(filters)):
        b0, b1, b2, a1, a2 = filters[band]
        z1 = np.zeros(audio.shape[0]); z2 = np.zeros(audio.shape[0])
        values = np.zeros(audio.shape[0])
        band_power = 0.0; full_power = 0.0; baseline = .01; reduction = 0.0
        for i in range(audio.shape[1]):
            bp = 0.0; fp = 0.0
            for ch in range(audio.shape[0]):
                x = output[ch, i]
                y = b0 * x + z1[ch]
                z1[ch] = b1 * x - a1 * y + z2[ch]
                z2[ch] = b2 * x - a2 * y
                values[ch] = y
                bp = max(bp, y * y); fp = max(fp, x * x)
            band_power = fast * band_power + (1 - fast) * bp
            full_power = fast * full_power + (1 - fast) * fp
            ratio = min(1.0, band_power / max(full_power, 1e-12))
            # Freeze the history during silence; no invented dominance there.
            if full_power > 3.162277660168379e-6:  # -55 dBFS power
                c = fast if i < warmup else history
                baseline = c * baseline + (1 - c) * ratio
            target = 0.0
            if i >= warmup and full_power > 3.162277660168379e-6:
                over = 10 * np.log10(max(ratio, 1e-12) / max(.18, baseline * 2))
                target = min(1.5 * amount, max(0.0, over * .5 * amount))
            c = attack if target > reduction else release
            reduction = c * reduction + (1 - c) * target
            subtract = 1 - 10 ** (-reduction / 20)
            for ch in range(audio.shape[0]):
                output[ch, i] -= subtract * values[ch]
    return output


def apply_dynamic_eq(audio, sr, amount=0.0):
    """Old parameters and 0% processing bypass exactly; no input mutation."""
    if not np.isfinite(amount) or not 0 <= amount <= 1:
        raise ValueError("Invalid dynamic EQ amount")
    if amount == 0 or not audio.size:
        return audio
    filters = np.array([coefficients(sr, f, q) for f, q in REGIONS if f < sr * .42])
    if not len(filters):
        return audio
    mono = audio.ndim == 1
    result = _process(audio[np.newaxis, :] if mono else audio, sr, amount, filters)
    return result[0] if mono else result
