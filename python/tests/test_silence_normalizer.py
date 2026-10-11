import io
import math
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from silence_normalizer import normalize_section, measure


class SilenceNormalizerTests(unittest.TestCase):
    SR = 48000

    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.file = Path(self.directory.name) / "input.wav"

    def tone(self, seconds=2, amplitude=.05):
        t = np.arange(round(seconds * self.SR)) / self.SR
        return (amplitude * np.sin(2 * np.pi * 997 * t)).astype(np.float32)

    def write(self, data):
        sf.write(self.file, data, self.SR, subtype="FLOAT")

    def test_gain_uses_selected_section_not_whole_track(self):
        source = np.concatenate([self.tone(amplitude=.02), self.tone(amplitude=.7)])
        self.write(source)
        wav, stats = normalize_section(self.file, 0, 2, -14)
        self.assertGreater(abs(measure(source[:, None], self.SR)["integrated_lufs"] - stats["before"]["integrated_lufs"]), 15)
        self.assertAlmostEqual(stats["after"]["integrated_lufs"], -14, delta=.05)
        self.assertFalse(stats["peak_limited"])
        self.assertAlmostEqual(stats["gain_db"], -14 - stats["before"]["integrated_lufs"], delta=.01)
        self.assertEqual(sf.info(io.BytesIO(wav)).frames, self.SR * 2)

    def test_native_44100_rate_is_preserved_for_flac_input(self):
        self.SR = 44100
        self.file = self.file.with_suffix(".flac")
        sf.write(self.file, self.tone(), self.SR, subtype="PCM_24")
        wav, stats = normalize_section(self.file, 0, 2, -14)
        self.assertEqual(sf.info(io.BytesIO(wav)).samplerate, 44100)
        self.assertEqual(stats["sample_rate"], 44100)
        self.assertEqual(stats["channels"], 1)
        self.assertAlmostEqual(stats["after"]["integrated_lufs"], -14, delta=.05)

    def test_report_is_measured_from_actual_pcm24_with_stereo_preserved(self):
        left = self.tone()
        self.write(np.stack([left, -left], axis=1))
        wav, stats = normalize_section(self.file, .2, 1.8, -14)
        output, sr = sf.read(io.BytesIO(wav), dtype="float32", always_2d=True)
        info = sf.info(io.BytesIO(wav))
        self.assertEqual(info.subtype, "PCM_24")
        self.assertEqual(info.channels, 2)
        self.assertEqual(sr, self.SR)
        actual = measure(output, sr)
        self.assertAlmostEqual(stats["after"]["integrated_lufs"], actual["integrated_lufs"], places=5)
        self.assertAlmostEqual(stats["after"]["true_peak"], actual["true_peak"], places=5)
        self.assertLess(np.max(np.abs(output[[0, -1]])), 3e-7)

    def test_spiky_track_reports_peak_limited_target(self):
        source = self.tone(amplitude=.005)
        source[self.SR] = .99
        self.write(source)
        _, stats = normalize_section(self.file, 0, 2, -9)
        self.assertTrue(stats["peak_limited"])
        self.assertLess(stats["after"]["integrated_lufs"], -10)
        self.assertLessEqual(stats["after"]["true_peak"], -1)

    def test_peak_ceiling_also_applies_when_requested_gain_is_negative(self):
        source = self.tone(amplitude=.9)
        source[self.SR] = 10
        self.write(source)
        _, stats = normalize_section(self.file, 0, 2, -14)
        self.assertLess(-14 - stats["before"]["integrated_lufs"], 0)
        self.assertLessEqual(stats["after"]["true_peak"], -1)

    def test_silence_is_not_assigned_fake_lufs(self):
        self.write(np.zeros(self.SR, dtype=np.float32))
        with self.assertRaisesRegex(ValueError, "too quiet"):
            normalize_section(self.file, 0, 1, -14)

    def test_invalid_or_too_short_ranges_and_nonfinite_target_are_rejected(self):
        self.write(self.tone())
        for start, end, target in [(-1, 2, -14), (0, 3, -14), (1, .5, -14), (0, .2, -14), (0, 2, math.nan), (0, 2, -3)]:
            with self.subTest(start=start, end=end, target=target), self.assertRaises(ValueError):
                normalize_section(self.file, start, end, target)

    def test_memory_budget_checked_before_pcm_decode(self):
        self.write(self.tone())
        with patch("silence_normalizer.MAX_SELECTED_SAMPLES", 10), patch("silence_normalizer.sf.read") as read:
            with self.assertRaisesRegex(ValueError, "memory budget"):
                normalize_section(self.file, 0, 2, -14)
            read.assert_not_called()

    def test_fades_are_included_in_section_measurement(self):
        source = self.tone(seconds=.4, amplitude=.04)
        source[0] = .99
        self.write(source)
        _, stats = normalize_section(self.file, 0, .4, -14)
        faded = source[:, None].copy()
        ramp = np.linspace(0, 1, round(.01 * self.SR), dtype=np.float32)
        faded[:len(ramp)] *= ramp[:, None]
        faded[-len(ramp):] *= ramp[::-1, None]
        self.assertAlmostEqual(stats["before"]["true_peak"], measure(faded, self.SR)["true_peak"], places=5)


if __name__ == "__main__":
    unittest.main()
