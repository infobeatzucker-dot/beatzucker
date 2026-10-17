"""Validate public demonstration files, never the musician's source folders."""
import json
import unittest
from pathlib import Path
import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from analyzer import compute_true_peak

ROOT = Path(__file__).resolve().parents[2]


class ShowcaseAssetsTests(unittest.TestCase):
    def test_prepared_audio_matches_published_measurements(self):
        manifest = json.loads((ROOT / "public/audio/showcase/manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(len(manifest["tracks"]), 2)
        for track in manifest["tracks"]:
            for side in ("original", "master"):
                with self.subTest(track=track["id"], side=side):
                    item = track[side]
                    target = (ROOT / "public" / item["url"].lstrip("/")).resolve()
                    self.assertTrue(target.is_relative_to(ROOT / "public/audio/showcase"))
                    self.assertEqual(target.stat().st_size, item["bytes"])
                    audio, rate = sf.read(target, dtype="float32", always_2d=True)
                    self.assertEqual(rate, 48000)
                    self.assertEqual(audio.shape, (24 * rate, 2))
                    self.assertTrue(np.isfinite(audio).all())
                    self.assertAlmostEqual(float(pyln.Meter(rate).integrated_loudness(audio)), item["metrics"]["lufs"], delta=.04)
                    self.assertAlmostEqual(float(compute_true_peak(audio.T, rate)), item["metrics"]["truePeak"], delta=.04)
                    rms = np.sqrt(np.mean(audio.astype(np.float64) ** 2))
                    crest = float(20 * np.log10(np.max(np.abs(audio)) / rms))
                    self.assertAlmostEqual(crest, item["metrics"]["crest"], delta=.04)
                    peaks = [float(np.max(np.abs(b))) for b in np.array_split(audio, 128)]
                    self.assertTrue(np.allclose(peaks, item["waveform"], atol=.0002))
