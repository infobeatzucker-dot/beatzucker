"""Exercise the actual SSE endpoint, not just the executor lease helper."""
import asyncio
import json
import sys
import threading
import unittest
from pathlib import Path
from unittest.mock import patch
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ai_params import MasteringParams
import main


class MasterDisconnectTests(unittest.IsolatedAsyncioTestCase):
    async def test_terminal_event_releases_slot_before_next_request(self):
        slots = asyncio.Semaphore(1)
        def worker(*args):
            return SimpleNamespace(master_id=args[-1], paths={}, post_analysis={}, notes="")
        with patch.object(main, "DSP_SLOTS", slots), \
             patch.object(main, "validate_file_path", side_effect=lambda value: value), \
             patch.object(main, "validate_output_dir", side_effect=lambda value: value), \
             patch.object(main, "get_mastering_params", return_value=MasteringParams()), \
             patch.object(main, "master_audio", side_effect=worker):
            # Leave each generator paused at its terminal yield, just like a
            # client that starts the next track without draining the old body.
            for index in range(3):
                master_id = f"test-consecutive-{index}"
                response = await main.master(main.MasterRequest(file_path="test.wav", master_id=master_id, analysis={"integrated_lufs": -14}))
                iterator = response.body_iterator
                async for chunk in iterator:
                    if json.loads(chunk.removeprefix("data: "))["step"] == "complete":
                        break
                self.assertEqual(slots._value, 1)
                self.assertNotIn(master_id, main.ACTIVE_MASTER_IDS)
                await iterator.aclose()
                self.assertEqual(slots._value, 1)

    async def test_memory_failure_releases_slot_and_reports_reason(self):
        slots = asyncio.Semaphore(1)
        with patch.object(main, "DSP_SLOTS", slots), \
             patch.object(main, "validate_file_path", side_effect=lambda value: value), \
             patch.object(main, "validate_output_dir", side_effect=lambda value: value), \
             patch.object(main, "get_mastering_params", side_effect=MemoryError("isolated fixture")):
            response = await main.master(main.MasterRequest(file_path="test.wav", master_id="test-memory-failure", analysis={"integrated_lufs": -14}))
            iterator = response.body_iterator
            async for chunk in iterator:
                event = json.loads(chunk.removeprefix("data: "))
                if event["step"] == "error":
                    self.assertEqual(event["error_code"], "memory")
                    break
            self.assertEqual(slots._value, 1)
            self.assertNotIn("test-memory-failure", main.ACTIVE_MASTER_IDS)
            await iterator.aclose()

    async def test_disconnect_check_releases_permit_before_worker_start(self):
        class Disconnected:
            async def is_disconnected(self):
                return True
        class Cancelled:
            async def is_disconnected(self):
                raise asyncio.CancelledError()
        slots = asyncio.Semaphore(1)
        with patch.object(main, "DSP_SLOTS", slots), \
             patch.object(main, "validate_file_path", side_effect=lambda value: value), \
             patch.object(main, "validate_output_dir", side_effect=lambda value: value), \
             patch.object(main, "master_audio") as worker:
            for request, error in [(Disconnected(), main.HTTPException), (Cancelled(), asyncio.CancelledError)]:
                with self.assertRaises(error):
                    await main.master(main.MasterRequest(file_path="test.wav", master_id="test-queued-disconnect"), request)
                self.assertEqual(slots._value, 1)
                self.assertNotIn("test-queued-disconnect", main.ACTIVE_MASTER_IDS)
            worker.assert_not_called()

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
