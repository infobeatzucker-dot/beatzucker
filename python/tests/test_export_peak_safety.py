"""Deterministic codec-overshoot regressions, no real songs or network."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import mastering


class ExportPeakSafetyTests(unittest.TestCase):
    def render(self, peaks):
        source = np.full((2, 1000), .25, dtype=np.float32)
        rendered = []
        def export(audio, sr, directory, master_id, selected):
            rendered.append(audio.copy())
            return {selected: "fixture.mp3", "preview": "fixture-preview.mp3"}
        with patch.object(mastering, "export_formats", side_effect=export), \
             patch.object(mastering, "load_and_verify_export", return_value=(source.copy(), 48000)), \
             patch.object(mastering, "compute_true_peak", side_effect=peaks):
            result = mastering.export_peak_safe(source, 48000, "isolated", "fixture-id", "mp3320", -1.0)
        np.testing.assert_array_equal(source, np.full((2, 1000), .25, dtype=np.float32))
        return result, rendered

    def test_safe_render_is_not_attenuated_or_repeated(self):
        result, rendered = self.render([-1.01])
        self.assertEqual(result[3:], (0.0, 0))
        self.assertEqual(len(rendered), 1)

    def test_existing_single_correction_keeps_identical_gain_and_tolerance(self):
        result, rendered = self.render([-.7, -.94])
        self.assertAlmostEqual(result[3], -.35)
        self.assertEqual(result[4], 1)
        self.assertEqual(len(rendered), 2)
        np.testing.assert_allclose(rendered[1], rendered[0] * 10 ** (-.35 / 20), rtol=1e-6)

    def test_non_scale_invariant_codec_gets_additional_verified_trim(self):
        result, rendered = self.render([-.4, -.8, -1.03])
        self.assertAlmostEqual(result[3], -1.0)
        self.assertEqual(result[4], 2)
        self.assertEqual(len(rendered), 3)
        np.testing.assert_allclose(rendered[2], rendered[0] * 10 ** (-1.0 / 20), rtol=1e-6)

    def test_three_corrections_are_bounded_and_never_accept_unsafe_output(self):
        with self.assertRaisesRegex(RuntimeError, "after 3 safety renders"):
            self.render([-.4, -.8, -.7, -.6])

    def test_invalid_measurement_is_not_silently_accepted(self):
        for value in (float("nan"), float("inf"), -float("inf")):
            with self.subTest(value=value), self.assertRaisesRegex(RuntimeError, "not finite"):
                self.render([value])

    def test_missing_selected_export_is_still_an_error(self):
        with patch.object(mastering, "export_formats", return_value={}), self.assertRaisesRegex(RuntimeError, "was not produced"):
            mastering.export_peak_safe(np.zeros((2, 100)), 48000, "isolated", "fixture-id", "mp3320", -1)
