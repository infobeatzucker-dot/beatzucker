import asyncio
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from dsp_admission import acquire_budget


class DspAdmissionTests(unittest.IsolatedAsyncioTestCase):
    async def test_bounded_master_queue_waits_and_prioritizes_over_new_tools(self):
        slots = asyncio.Semaphore(1)
        active = await acquire_budget(slots, 1, master=True)
        waiting = asyncio.create_task(acquire_budget(slots, 1, master=True, timeout=1, max_waiting=1))
        await asyncio.sleep(.01)
        with self.assertRaises(asyncio.TimeoutError):
            await acquire_budget(slots, 1, master=True, timeout=1, max_waiting=1)
        with self.assertRaises(asyncio.TimeoutError):
            await acquire_budget(slots, 1)
        active.release()
        next_master = await waiting
        next_master.release()
        tool = await acquire_budget(slots, 1)
        tool.release()
        self.assertEqual(slots._value, 1)

    async def test_cancelled_and_timed_out_master_waiters_are_removed(self):
        slots = asyncio.Semaphore(1)
        active = await acquire_budget(slots, 1, master=True)
        with self.assertRaises(asyncio.TimeoutError):
            await acquire_budget(slots, 1, master=True, timeout=.001, max_waiting=1)
        waiting = asyncio.create_task(acquire_budget(slots, 1, master=True, timeout=1, max_waiting=1))
        await asyncio.sleep(.01)
        waiting.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await waiting
        active.release()
        tool = await acquire_budget(slots, 1)
        tool.release()

    async def test_one_slot_remains_available_for_mastering(self):
        slots = asyncio.Semaphore(2)
        tool = await acquire_budget(slots, 2)
        with self.assertRaises(asyncio.TimeoutError):
            await acquire_budget(slots, 2)
        master = await acquire_budget(slots, 2, master=True)
        self.assertTrue(slots.locked())
        master.release()
        tool.release()
        tool.release()
        self.assertEqual(slots._value, 2)
        next_tool = await acquire_budget(slots, 2)
        next_tool.release()

    async def test_timeout_does_not_leak_tool_reservation(self):
        slots = asyncio.Semaphore(1)
        master = await acquire_budget(slots, 1, master=True)
        with self.assertRaises(asyncio.TimeoutError):
            await acquire_budget(slots, 1, timeout=.001)
        master.release()
        tool = await acquire_budget(slots, 1)
        tool.release()
        self.assertEqual(slots._value, 1)

    async def test_cancelled_waiter_does_not_leak_reservation(self):
        slots = asyncio.Semaphore(1)
        master = await acquire_budget(slots, 1, master=True)
        pending = asyncio.create_task(acquire_budget(slots, 1, timeout=2))
        await asyncio.sleep(.01)
        pending.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await pending
        master.release()
        tool = await acquire_budget(slots, 1)
        tool.release()
