import asyncio
import sys
import threading
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from dsp_lease import DspLease


class DspLeaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_disconnect_keeps_slot_until_thread_finishes(self):
        slots = asyncio.Semaphore(1)
        await slots.acquire()
        gate = threading.Event()
        started = threading.Event()
        released = []
        lease = DspLease(slots, lambda: released.append(True))

        def work():
            started.set()
            gate.wait(2)
            return 42

        task = asyncio.create_task(lease.run(work))
        try:
            while not started.is_set():
                await asyncio.sleep(0.001)
            task.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await task
            lease.release_when_done()
            self.assertTrue(slots.locked())
            self.assertFalse(lease.pending.cancelled())
            self.assertEqual(released, [])
        finally:
            gate.set()
            await asyncio.shield(lease.pending)
            await asyncio.sleep(0)
        self.assertFalse(slots.locked())
        self.assertEqual(released, [True])
        lease.release_when_done()
        self.assertEqual(slots._value, 1)

    async def test_normal_completion_and_failure_release_exactly_once(self):
        for fails in (False, True):
            slots = asyncio.Semaphore(1)
            await slots.acquire()
            lease = DspLease(slots)

            def work():
                if fails:
                    raise ValueError("test failure")
                return 12

            try:
                if fails:
                    with self.assertRaises(ValueError):
                        await lease.run(work)
                else:
                    self.assertEqual(await lease.run(work), 12)
            finally:
                lease.release_when_done()
            lease.release_when_done()
            self.assertEqual(slots._value, 1)
