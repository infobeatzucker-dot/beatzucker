import asyncio
import sys
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import main


class TrimDisconnectTests(unittest.IsolatedAsyncioTestCase):
    async def test_cancelled_normalization_keeps_dsp_slot_until_worker_finishes(self):
        slots = asyncio.Semaphore(1)
        started, finish = threading.Event(), threading.Event()

        def worker(*args):
            started.set()
            finish.wait(3)
            return b"test", {}

        with patch.object(main, "DSP_SLOTS", slots), \
             patch.object(main, "validate_file_path", side_effect=lambda value: value), \
             patch.object(main, "normalize_section", side_effect=worker):
            task = asyncio.create_task(main.trim_normalize(main.TrimNormalizeRequest(file_path="test.wav", start=0, end=2, target=-14)))
            try:
                for _ in range(200):
                    if started.is_set():
                        break
                    await asyncio.sleep(.005)
                self.assertTrue(started.is_set())
                task.cancel()
                with self.assertRaises(asyncio.CancelledError):
                    await task
                self.assertTrue(slots.locked())
            finally:
                finish.set()
                for _ in range(200):
                    if not slots.locked():
                        break
                    await asyncio.sleep(.005)
            self.assertEqual(slots._value, 1)
