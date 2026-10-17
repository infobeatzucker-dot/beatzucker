"""Actual bounded FFmpeg excerpts and cancellation-safe admission, synthetic audio only."""
import asyncio
import os
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch
import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import main
import showcase_prepare as showcase


class ShowcaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.folder = Path(cls.temp.name)
        rng = np.random.default_rng(72)
        t = np.arange(28 * showcase.RATE) / showcase.RATE
        noise = rng.normal(0, .012, len(t))
        tone = .1 * np.sin(2*np.pi*230*t) * (.6+.4*np.sin(2*np.pi*1.7*t)) + noise
        audio = np.column_stack([tone, .8*tone+.01*np.sin(2*np.pi*720*t)])
        cls.original, cls.master = cls.folder/'original.wav', cls.folder/'master.wav'
        sf.write(cls.original, audio, showcase.RATE, subtype='PCM_16')
        sf.write(cls.master, audio*1.6, showcase.RATE, subtype='PCM_16')

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def test_actual_aligned_pair_and_original_levels(self):
        with patch.dict(os.environ, {'SHOWCASE_STORAGE_DIR':str(self.folder/'output')}):
            result = showcase.prepare_showcase(self.original, self.master, 1, '11111111-2222-4333-8444-555555555555')
        self.assertEqual(result['duration'], 24)
        for side in ('original','master'):
            item = result[side]
            self.assertEqual(len(item['waveform']), 128)
            self.assertTrue(23.9 < item['duration'] < 24.2)
            self.assertTrue(800_000 < item['bytes'] < 1_100_000)
            self.assertTrue(all(np.isfinite(v) for v in item['metrics'].values()))
        # No loudness normalization in stored samples: source gain survives preparation.
        self.assertAlmostEqual(result['master']['metrics']['lufs']-result['original']['metrics']['lufs'], 20*np.log10(1.6), delta=.2)

    def test_preexisting_assets_are_never_overwritten_or_removed(self):
        folder = self.folder/'existing'; folder.mkdir()
        asset = '22222222-2222-4333-8444-555555555555'
        target = folder/f'{asset}-original.mp3'; target.write_bytes(b'owned-by-another-job')
        with patch.dict(os.environ, {'SHOWCASE_STORAGE_DIR':str(folder)}):
            with self.assertRaises(FileExistsError):
                showcase.prepare_showcase(self.original, self.master, 1, asset)
        self.assertEqual(target.read_bytes(), b'owned-by-another-job')
        self.assertFalse((folder/f'{asset}-master.mp3').exists())

    def test_bad_input_and_silence_cannot_publish_a_pair(self):
        for start in (float('nan'), -1, 601):
            with self.assertRaises(ValueError): showcase.prepare_showcase('', '', start, '33333333-2222-4333-8444-555555555555')
        with self.assertRaises(ValueError): showcase.prepare_showcase('', '', 0, '../escape')
        folder = self.folder/'silence'
        with patch.dict(os.environ, {'SHOWCASE_STORAGE_DIR':str(folder)}), patch.object(showcase, '_decode', return_value=np.zeros((26*showcase.RATE,2),dtype=np.float32)):
            with self.assertRaises(ValueError): showcase.prepare_showcase('', '', 0, '44444444-2222-4333-8444-555555555555')
        self.assertEqual(list(folder.glob('*.mp3')), [])


class ShowcaseLeaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_internal_endpoint_keeps_budget_until_cancelled_worker_finishes(self):
        self.assertIn('/showcase-prepare', main.PROTECTED_PATHS)
        slots=asyncio.Semaphore(1); started=threading.Event(); finished=threading.Event()
        def worker(*_): started.set(); finished.wait(3); return {}
        with patch.object(main,'DSP_SLOTS',slots), patch.object(main,'validate_file_path',side_effect=lambda value:value), patch.object(main,'prepare_showcase',side_effect=worker):
            task=asyncio.create_task(main.showcase_prepare(main.ShowcasePrepareRequest(original='original.wav',master='master.wav',start=0,asset_id='fixture')))
            try:
                for _ in range(200):
                    if started.is_set(): break
                    await asyncio.sleep(.005)
                self.assertTrue(started.is_set()); task.cancel()
                with self.assertRaises(asyncio.CancelledError): await task
                self.assertEqual(slots._value,0)
            finally:
                finished.set()
                for _ in range(200):
                    if slots._value==1: break
                    await asyncio.sleep(.005)
            self.assertEqual(slots._value,1)


if __name__ == '__main__': unittest.main()
