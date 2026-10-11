import os
import sys
import tempfile
import unittest
import numpy as np
import soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from analyzer import analyze_audio, analysis_to_dict, detect_key

class ToolsQualityTests(unittest.TestCase):
    def analyze(self, left, right):
        with tempfile.TemporaryDirectory() as folder:
            filename = os.path.join(folder, "test.wav")
            sf.write(filename, np.stack([left, right], axis=1), 48000, subtype="FLOAT")
            return analysis_to_dict(analyze_audio(filename))

    def test_single_channel_over_is_detected(self):
        tone = np.sin(2*np.pi*440*np.arange(96000)/48000)
        result = self.analyze(1.05*tone, -.95*tone)
        self.assertTrue(result["clipping_detected"])

    def test_counterphase_returns_bounded_analysis(self):
        tone = .8*np.sin(2*np.pi*440*np.arange(96000)/48000)
        result = self.analyze(tone, -tone)
        self.assertLessEqual(result["stereo_width"], 20)
        self.assertLess(result["mono_compatibility"], -.99)
        self.assertGreater(result["spectral_centroid"], 100)

    def test_silence_has_no_key(self):
        self.assertEqual(detect_key(np.zeros(48000), 48000), "Unknown")

    def test_silent_full_analysis_fits_api_flatness_bounds(self):
        result = self.analyze(np.zeros(96000), np.zeros(96000))
        self.assertEqual(result["key"], "Unknown")
        self.assertEqual(result["spectral_flatness"], 0.0)

if __name__ == "__main__":
    unittest.main()
