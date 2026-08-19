"""Small end-to-end render test using generated audio only."""

import tempfile
import unittest
from pathlib import Path
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ai_params import get_mastering_params
from analyzer import compute_true_peak
from mastering import master_audio, load_and_verify_export


class MasteringIntegrationTests(unittest.TestCase):
    def test_full_chain_renders_and_verifies_selected_file(self):
        sr = 48_000
        duration = 4
        t = np.arange(sr * duration, dtype=np.float32) / sr
        envelope = np.linspace(0.35, 0.7, len(t), dtype=np.float32)
        left = envelope * (0.45 * np.sin(2 * np.pi * 110 * t) + 0.12 * np.sin(2 * np.pi * 3100 * t))
        right = envelope * (0.45 * np.sin(2 * np.pi * 110 * t + 0.03) + 0.12 * np.sin(2 * np.pi * 3300 * t))
        stereo = np.stack([left, right]).astype(np.float32)
        pre = {
            "integrated_lufs": -15.0, "true_peak": -5.0,
            "crest_factor": 9.0, "lra": 6.0,
            "rms_sub": -26.0, "rms_low": -21.0, "rms_mid": -24.0,
            "rms_high": -31.0, "rms_air": -45.0,
            "spectral_centroid": 2300.0, "spectral_width": 0.3,
            "stereo_width": 0.3, "mono_compatibility": 0.8,
            "bpm": 120.0, "key": "A minor", "transient_density": 1.2,
        }
        params = get_mastering_params(pre, platform="spotify", intensity=45)

        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source.wav"
            output = Path(directory) / "masters"
            sf.write(source, stereo.T, sr, subtype="PCM_24")
            result = master_audio(
                str(source), params, str(output), selected_format="wav24",
                pre_analysis=pre, master_id="integration-test",
            )

            self.assertIn("wav24", result.paths)
            self.assertIn("mp3320", result.paths)
            self.assertNotIn("mp3128", result.paths)
            decoded, decoded_sr = load_and_verify_export(result.paths["wav24"], "wav24", sr)
            self.assertEqual(decoded_sr, sr)
            self.assertEqual(decoded.shape[0], 2)
            self.assertLessEqual(result.post_analysis["true_peak"], -0.9)
            self.assertEqual(result.post_analysis["bit_depth"], 24)
            self.assertTrue(np.all(np.isfinite(decoded)))

            preview, preview_sr = load_and_verify_export(result.paths["mp3320"], "mp3320", sr)
            self.assertEqual(preview_sr, sr)
            self.assertTrue(np.all(np.isfinite(preview)))
            # Lossy encoding may add a small reconstructed peak, but the A/B
            # preview must remain safely below full scale.
            self.assertLessEqual(compute_true_peak(preview, preview_sr), -0.75)


if __name__ == "__main__":
    unittest.main()
