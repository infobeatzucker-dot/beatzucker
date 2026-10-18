import asyncio
import sys
import threading
import unittest
from pathlib import Path
from unittest.mock import patch
from fastapi import HTTPException
from starlette.requests import Request
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import main

class SpeechBudgetTests(unittest.IsolatedAsyncioTestCase):
    async def test_disconnect_does_not_release_live_worker(self):
        slots=asyncio.Semaphore(1)
        started,finish=threading.Event(),threading.Event()
        def worker(*args):
            started.set();finish.wait(3)
            return b"wav",{"true_peak":-1.2,"integrated_lufs":-19}
        with patch.object(main,"DSP_SLOTS",slots),patch.object(main,"validate_file_path",side_effect=lambda v:v),patch.object(main,"clean_speech",side_effect=worker):
            task=asyncio.create_task(main.speech_clean(main.SpeechCleanRequest(file_path="test.wav")))
            try:
                for _ in range(200):
                    if started.is_set():break
                    await asyncio.sleep(.005)
                self.assertTrue(started.is_set())
                with self.assertRaises(HTTPException) as busy:await main.acquire_dsp_slot()
                self.assertEqual(busy.exception.status_code,503)
                task.cancel()
                with self.assertRaises(asyncio.CancelledError):await task
                self.assertTrue(slots.locked())
            finally:
                finish.set()
                for _ in range(200):
                    if not slots.locked():break
                    await asyncio.sleep(.005)
            self.assertEqual(slots._value,1)

    async def test_internal_route_requires_secret(self):
        self.assertIn("/speech-clean",main.PROTECTED_PATHS)
        async def handler(req):return "allowed"
        with patch.object(main,"SERVICE_SECRET","test-only-secret"):
            for token in [b"",b"wrong",b"test-only-secret"]:
                req=Request({"type":"http","method":"POST","path":"/speech-clean","headers":[(b"x-beatzucker-service-token",token)]})
                result=await main.authenticate_internal_service(req,handler)
                if token==b"test-only-secret":self.assertEqual(result,"allowed")
                else:self.assertEqual(result.status_code,401)
