"""Reserve one configured DSP slot for mastering; permits follow worker lifetime."""
import asyncio
from weakref import WeakKeyDictionary

_tools = WeakKeyDictionary()
_masters_waiting = WeakKeyDictionary()


class Permit:
    def __init__(self, slots, tool):
        self.slots, self.tool, self.released = slots, tool, False

    def release(self):
        if self.released:
            return
        self.released = True
        if self.tool:
            _tools[self.slots] = max(0, _tools.get(self.slots, 0) - 1)
        self.slots.release()


async def acquire_budget(slots, capacity, master=False, timeout=.1, max_waiting=4):
    tool = not master
    if tool:
        # With a single slot, tools remain usable. With >=2, leave one for masters.
        limit = max(1, capacity - 1)
        if _tools.get(slots, 0) >= limit or _masters_waiting.get(slots, 0):
            raise asyncio.TimeoutError()
        _tools[slots] = _tools.get(slots, 0) + 1
    else:
        if _masters_waiting.get(slots, 0) >= max_waiting:
            raise asyncio.TimeoutError()
        _masters_waiting[slots] = _masters_waiting.get(slots, 0) + 1
    try:
        await asyncio.wait_for(slots.acquire(), timeout=timeout)
    except BaseException:
        if tool:
            _tools[slots] = max(0, _tools.get(slots, 0) - 1)
        raise
    finally:
        if master:
            _masters_waiting[slots] = max(0, _masters_waiting.get(slots, 0) - 1)
    return Permit(slots, tool)
