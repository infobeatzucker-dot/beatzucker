"""Regression tests for the bounded manual-editor waveform."""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from waveform import extract_waveform_peaks


class WaveformTests(unittest.TestCase):
    def test_returns_finite_normalized_fixed_size_peaks(self):
        quiet = np.full(2400, 0.04, dtype="<f4")
        loud = np.linspace(-0.8, 0.8, 2400, dtype="<f4")
        decoded = np.concatenate([quiet, loud])
        completed = subprocess.CompletedProcess([], 0, stdout=decoded.tobytes(), stderr=b"")

        with patch("waveform.subprocess.run", return_value=completed) as run:
            peaks = extract_waveform_peaks("track.wav", bins=240)

        self.assertEqual(len(peaks), 240)
        self.assertTrue(all(np.isfinite(value) and 0.06 <= value <= 1 for value in peaks))
        self.assertGreater(np.mean(peaks[120:]), np.mean(peaks[:120]) * 3)
        command = run.call_args.args[0]
        self.assertIn("-ar", command)
        self.assertIn("-t", command)

    def test_rejects_empty_decoder_output(self):
        completed = subprocess.CompletedProcess([], 0, stdout=b"", stderr=b"")
        with patch("waveform.subprocess.run", return_value=completed):
            with self.assertRaises(ValueError):
                extract_waveform_peaks("empty.wav")

    def test_uses_bounded_soundfile_fallback_without_ffmpeg(self):
        sample_rate = 8000
        time = np.arange(sample_rate * 2, dtype=np.float32) / sample_rate
        signal = (np.sin(2 * np.pi * 220 * time) * np.linspace(0.05, 0.8, time.size)).astype(np.float32)
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "fallback.wav"
            sf.write(source, signal, sample_rate)
            with patch("waveform.subprocess.run", side_effect=FileNotFoundError):
                peaks = extract_waveform_peaks(str(source), bins=64)

        self.assertEqual(len(peaks), 64)
        self.assertGreater(np.mean(peaks[32:]), np.mean(peaks[:32]) * 1.5)


if __name__ == "__main__":
    unittest.main()
