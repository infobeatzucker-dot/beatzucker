import io
import tempfile
import unittest
from pathlib import Path
import numpy as np
import soundfile as sf
from preview_section import read_preview_section


class PreviewSectionTests(unittest.TestCase):
    def test_bounded_pcm16_section_and_original_unchanged(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'source.wav'
            sf.write(source, np.ones((48000 * 3, 2)) * .2, 48000, subtype='PCM_16')
            original = source.read_bytes()
            raw = read_preview_section(str(source), 1, 2)
            audio, rate = sf.read(io.BytesIO(raw), always_2d=True)
            self.assertEqual(rate, 48000)
            self.assertEqual(audio.shape, (48000, 2))
            self.assertLess(len(raw), 8000000)
            self.assertTrue(np.allclose(audio, .2, atol=1e-4))
            self.assertEqual(source.read_bytes(), original)

    def test_high_rate_audition_is_bounded_to_48k(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'source.wav'
            sf.write(source, np.zeros((96000, 2)), 96000)
            info = sf.info(io.BytesIO(read_preview_section(str(source), 0, 1)))
            self.assertEqual(info.samplerate, 48000)
            self.assertEqual(info.frames, 48000)

    def test_invalid_regions_rejected_before_read(self):
        for start, end in [(-1, 1), (0, 21), (2, 1), (0, float('nan')), (0, 0)]:
            with self.assertRaises(ValueError):
                read_preview_section('does-not-exist.wav', start, end)
