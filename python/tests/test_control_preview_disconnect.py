"""Control renders use the same cancellation-safe DSP budget as full masters."""
import asyncio
import sys
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import main


class ControlLeaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_protected_route_releases_slot_when_already_disconnected(self):
        self.assertIn("/control-preview", main.PROTECTED_PATHS)
        class Request:
            async def is_disconnected(self): return True
        slots = asyncio.Semaphore(1)
        with patch.object(main, "DSP_SLOTS", slots), patch.object(main, "validate_file_path", side_effect=lambda value:value), patch.object(main, "render_control") as worker:
            with self.assertRaises(main.HTTPException):
                await main.control_preview(main.ControlPreviewRequest(file_path="fixture.wav", start=0, end=1, analysis={}), Request())
            worker.assert_not_called()
            self.assertEqual(slots._value, 1)

    async def test_disconnect_does_not_release_budget_while_worker_still_runs(self):
        class Request:
            async def is_disconnected(self): return False
        slots = asyncio.Semaphore(1); started = threading.Event(); finished = threading.Event()
        def worker(*_): started.set(); finished.wait(3); return b"test"
        with patch.object(main, "DSP_SLOTS", slots), patch.object(main, "validate_file_path", side_effect=lambda value:value), patch.object(main, "render_control", side_effect=worker):
            task = asyncio.create_task(main.control_preview(main.ControlPreviewRequest(file_path="fixture.wav", start=0, end=1, analysis={}), Request()))
            try:
                for _ in range(200):
                    if started.is_set(): break
                    await asyncio.sleep(.005)
                self.assertTrue(started.is_set()); task.cancel()
                with self.assertRaises(asyncio.CancelledError): await task
                self.assertEqual(slots._value, 0)
            finally:
                finished.set()
                for _ in range(200):
                    if slots._value == 1: break
                    await asyncio.sleep(.005)
            self.assertEqual(slots._value, 1)


if __name__ == "__main__": unittest.main()
