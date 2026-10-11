"""Hold a DSP permit until executor work really ends, even after disconnect."""
import asyncio
import logging


class DspLease:
    def __init__(self, semaphore, on_release=None):
        # Caller has already acquired the semaphore.
        self.semaphore = semaphore
        self.pending = None
        self.released = False
        self.on_release = on_release

    def submit(self, function, *args):
        if self.released or (self.pending is not None and not self.pending.done()):
            raise RuntimeError("DSP lease already released or busy")
        self.pending = asyncio.get_running_loop().run_in_executor(None, function, *args)
        return self.pending

    async def run(self, function, *args):
        # Cancelling the awaiting coroutine must not cancel the executor Future.
        return await asyncio.shield(self.submit(function, *args))

    def release_when_done(self):
        if self.released:
            return
        if self.pending is not None and not self.pending.done():
            self.pending.add_done_callback(self._release)
        else:
            self._release(self.pending)

    def _release(self, future):
        if self.released:
            return
        self.released = True
        if future is not None and not future.cancelled():
            error = future.exception()
            if error:
                logging.getLogger("beatzucker").error("DSP worker failed: %s", error)
        self.semaphore.release()
        if self.on_release:
            self.on_release()
