"""Regression tests for honest, level-independent adaptive parameter selection."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ai_params import get_mastering_params


def analysis(**updates):
    base = {
        "integrated_lufs": -18.0,
        "true_peak": -5.0,
        "crest_factor": 10.0,
        "lra": 8.0,
        "rms_sub": -28.0,
        "rms_low": -23.0,
        "rms_mid": -22.0,
        "rms_high": -28.0,
        "rms_air": -38.0,
        "spectral_centroid": 2600.0,
        "stereo_width": 0.4,
        "mono_compatibility": 0.7,
    }
    base.update(updates)
    return base


class AdaptiveParameterTests(unittest.TestCase):
    def test_custom_lufs_is_real_and_clamped(self):
        params = get_mastering_params(
            analysis(), platform="custom", target_lufs=-11.5
        )
        self.assertEqual(params.target_lufs, -11.5)

    def test_upload_gain_does_not_change_adaptive_compression(self):
        quiet = get_mastering_params(analysis(integrated_lufs=-30.0))
        loud = get_mastering_params(analysis(integrated_lufs=-8.0))
        self.assertEqual(quiet.bus_comp_threshold, loud.bus_comp_threshold)
        self.assertEqual(quiet.bus_comp_ratio, loud.bus_comp_ratio)

    def test_zero_intensity_bypasses_creative_parameters(self):
        params = get_mastering_params(analysis(), intensity=0, preset="edm")
        self.assertEqual(params.processing_intensity, 0)
        self.assertEqual(params.mb_sub_ratio, 1.0)
        self.assertEqual(params.mb_low_ratio, 1.0)
        self.assertEqual(params.mb_mid_ratio, 1.0)
        self.assertEqual(params.mb_high_ratio, 1.0)
        self.assertEqual(params.bus_comp_ratio, 1.0)
        self.assertEqual(params.saturation_amount, 0.0)
        self.assertEqual(params.stereo_width, 1.0)

    def test_reference_matching_uses_dynamics_and_relative_low_balance(self):
        source = analysis(lra=13.0, rms_low=-28.0, rms_mid=-22.0)
        reference = {
            "spectral_centroid": 2600.0,
            "rms_sub": -28.0,
            "rms_low": -20.0,
            "rms_mid": -22.0,
            "stereo_width": 0.4,
            "mono_compatibility": 0.7,
            "lra": 6.0,
        }
        without = get_mastering_params(source)
        matched = get_mastering_params(source, reference_analysis=reference)
        self.assertGreater(matched.low_shelf_gain, without.low_shelf_gain)
        self.assertGreaterEqual(matched.bus_comp_ratio, without.bus_comp_ratio)

    def test_manual_remaster_overrides_are_applied_clamped_and_whitelisted(self):
        params = get_mastering_params(
            analysis(),
            overrides={
                "air_gain": 2.4,
                "stereo_width": 99,
                "target_lufs": -3,
                "unknown_processor": 1,
            },
        )
        self.assertEqual(params.air_gain, 2.4)
        self.assertEqual(params.stereo_width, 2.0)
        self.assertEqual(params.target_lufs, -14.0)
        self.assertFalse(hasattr(params, "unknown_processor"))
        self.assertIn("Manuell angepasst: 2 Parameter", params.notes)


if __name__ == "__main__":
    unittest.main()
