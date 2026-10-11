import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from audio_limits import validate_full_dsp_audio
from analyzer import analyze_audio


class AudioLimitTests(unittest.TestCase):
    def info(self, rate=48000, duration=300, channels=2):
        return SimpleNamespace(samplerate=rate, duration=duration, channels=channels, frames=int(rate * duration))

    def test_normal_stereo_and_mono_are_accepted(self):
        for channels in [1, 2]:
            validate_full_dsp_audio(self.info(channels=channels))

    def test_long_high_rate_and_mono_expansion_are_rejected_before_decoding(self):
        for channels in [1, 2]:
            with patch("analyzer.sf.info", return_value=self.info(192000, 600, channels)), patch("analyzer.librosa.load") as load:
                with self.assertRaises(ValueError):
                    analyze_audio("compressed-test.flac")
                load.assert_not_called()

    def test_channel_rate_duration_and_frames_limits(self):
        for info in [self.info(channels=3), self.info(rate=384000), self.info(duration=0), self.info(duration=1801)]:
            with self.assertRaises(ValueError):
                validate_full_dsp_audio(info)
        bad = self.info()
        bad.duration = float("nan")
        with self.assertRaises(ValueError):
            validate_full_dsp_audio(bad)
