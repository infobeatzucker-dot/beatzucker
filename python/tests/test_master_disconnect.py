"""Exercise the actual SSE endpoint, not just the executor lease helper."""
import asyncio
import sys
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import main


class MasterDisconnectTests(unittest.IsolatedAsyncioTestCase):
    async def test_cancelled_stream_keeps_worker_registered_and_slot_reserved(self):
        slots = asyncio.Semaphore(1)
        started, finish = threading.Event(), threading.Event()
        master_id = "test-disconnect-master"

        def worker(*args):
            started.set()
            finish.wait(3)

        with patch.object(main, "DSP_SLOTS", slots), \
             patch.object(main, "validate_file_path", side_effect=lambda value: value), \
             patch.object(main, "validate_output_dir", side_effect=lambda value: value), \
             patch.object(main, "get_mastering_params", return_value=object()), \
             patch.object(main, "master_audio", side_effect=worker):
            response = await main.master(main.MasterRequest(
                file_path="test.wav", master_id=master_id, analysis={"integrated_lufs": -14},
            ))
            iterator = response.body_iterator
            await anext(iterator)  # Initial analyzing event.
            await anext(iterator)  # Parameter-selection event.
            task = asyncio.create_task(anext(iterator))
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
                self.assertIn(master_id, main.ACTIVE_MASTER_IDS)
            finally:
                finish.set()
                await iterator.aclose()
                for _ in range(200):
                    if master_id not in main.ACTIVE_MASTER_IDS:
                        break
                    await asyncio.sleep(.005)
            self.assertFalse(slots.locked())
            self.assertNotIn(master_id, main.ACTIVE_MASTER_IDS)
            self.assertEqual(slots._value, 1)
