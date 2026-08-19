"""Regression tests for mastering invariants that must never be cosmetic."""

import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from analyzer import compute_true_peak
from mastering import (
    apply_true_peak_limiter,
    compress_band,
    db_to_linear,
    linkwitz_riley_crossover,
)


class DspQualityTests(unittest.TestCase):
    SR = 48_000

    def test_true_peak_is_channel_aware_for_antiphase_stereo(self):
        t = np.arange(self.SR, dtype=np.float32) / self.SR
        tone = (0.5 * np.sin(2 * np.pi * 997 * t)).astype(np.float32)
        stereo = np.stack([tone, -tone])
        measured = compute_true_peak(stereo, self.SR)
        self.assertGreater(measured, -6.2)
        self.assertLess(measured, -5.7)

    def test_linkwitz_riley_sum_is_near_unity_away_from_startup(self):
        rng = np.random.default_rng(42)
        signal = rng.normal(0, 0.08, self.SR * 2).astype(np.float32)
        low, high = linkwitz_riley_crossover(signal, self.SR, 5000)
        # IIR filters begin at zero state; ignore their short startup transient.
        start = self.SR // 2
        original_rms = np.sqrt(np.mean(signal[start:] ** 2))
        summed_rms = np.sqrt(np.mean((low[start:] + high[start:]) ** 2))
        error_db = 20 * np.log10(summed_rms / original_rms)
        self.assertLess(abs(error_db), 0.15)

    def test_compressor_reduction_is_active_and_bounded(self):
        t = np.arange(self.SR * 2, dtype=np.float32) / self.SR
        tone = (0.5 * np.sin(2 * np.pi * 220 * t)).astype(np.float32)
        result = compress_band(
            tone, self.SR, threshold_db=-30, ratio=8,
            attack_ms=1, release_ms=100, max_reduction_db=3,
        )
        stable = slice(self.SR, None)
        ratio = np.sqrt(np.mean(result[stable] ** 2)) / np.sqrt(np.mean(tone[stable] ** 2))
        reduction_db = -20 * np.log10(ratio)
        self.assertGreater(reduction_db, 2.5)
        self.assertLessEqual(reduction_db, 3.05)

    def test_limiter_respects_true_peak_ceiling(self):
        # High-frequency, phase-shifted stereo exposes inter-sample overshoots.
        t = np.arange(self.SR * 4, dtype=np.float32) / self.SR
        left = (0.7 * np.sin(2 * np.pi * 17_777 * t + 0.37)).astype(np.float32)
        right = (0.7 * np.sin(2 * np.pi * 16_333 * t + 1.11)).astype(np.float32)
        limited = apply_true_peak_limiter(
            np.stack([left, right]), self.SR,
            ceiling_db=-1.0, target_lufs=-8.0, max_gain_reduction_db=4.0,
        )
        measured = compute_true_peak(limited, self.SR)
        self.assertLessEqual(measured, -0.95)
        self.assertTrue(np.all(np.isfinite(limited)))

    def test_limiter_does_not_exceed_configured_peak_reduction_budget(self):
        t = np.arange(self.SR * 4, dtype=np.float32) / self.SR
        quiet = (0.035 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)
        quiet[self.SR * 2] = 0.95
        stereo = np.stack([quiet, quiet])
        limited = apply_true_peak_limiter(
            stereo, self.SR, ceiling_db=-1.0,
            target_lufs=-6.0, max_gain_reduction_db=4.0,
        )
        # The transient asks for far more than 4 dB of limiting. The algorithm
        # must compromise loudness and preserve it instead of chasing -6 LUFS.
        body_rms_in = np.sqrt(np.mean(quiet[:self.SR] ** 2))
        body_rms_out = np.sqrt(np.mean(limited[0, :self.SR] ** 2))
        applied_gain_db = 20 * np.log10(body_rms_out / body_rms_in)
        max_safe_gain_db = -1.0 - compute_true_peak(stereo, self.SR) + 4.0
        self.assertLessEqual(applied_gain_db, max_safe_gain_db + 0.15)


if __name__ == "__main__":
    unittest.main()
