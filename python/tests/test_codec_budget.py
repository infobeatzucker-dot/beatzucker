import asyncio
import sys
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException
from starlette.requests import Request

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import main


class CodecBudgetTests(unittest.IsolatedAsyncioTestCase):
    async def test_codec_slot_blocks_mastering_and_remains_held_after_disconnect(self):
        slots = asyncio.Semaphore(1)
        started, finish = threading.Event(), threading.Event()
        def worker(*args):
            started.set()
            finish.wait(3)
            return b"encoded", "audio/mpeg", {"true_peak": -1.2, "integrated_lufs": -14}
        with patch.object(main, "DSP_SLOTS", slots), \
             patch.object(main, "validate_file_path", side_effect=lambda value: value), \
             patch.object(main, "render_codec", side_effect=worker):
            task = asyncio.create_task(main.codec_preview(main.CodecPreviewRequest(file_path="test.wav", codec="mp3320")))
            try:
                for _ in range(200):
                    if started.is_set():
                        break
                    await asyncio.sleep(.005)
                self.assertTrue(started.is_set())
                with self.assertRaises(HTTPException) as busy:
                    await main.acquire_dsp_slot()
                self.assertEqual(busy.exception.status_code, 503)
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

    async def test_codec_and_meter_service_routes_are_protected(self):
        self.assertIn("/codec-preview", main.PROTECTED_PATHS)
        self.assertIn("/meter", main.PROTECTED_PATHS)
        called = []
        async def next_handler(request):
            called.append(request.url.path)
            return "allowed"
        with patch.object(main, "SERVICE_SECRET", "test-only-service-secret"):
            for endpoint in ["/codec-preview", "/meter"]:
                for token in [None, "wrong", "test-only-service-secret"]:
                    headers = [] if token is None else [(b"x-beatzucker-service-token", token.encode())]
                    request = Request({"type": "http", "method": "POST", "path": endpoint, "headers": headers})
                    response = await main.authenticate_internal_service(request, next_handler)
                    if token == "test-only-service-secret":
                        self.assertEqual(response, "allowed")
                    else:
                        self.assertEqual(response.status_code, 401)
        self.assertEqual(called, ["/codec-preview", "/meter"])

    async def test_lightweight_meter_does_not_run_full_analysis(self):
        with patch.object(main, "DSP_SLOTS", asyncio.Semaphore(1)), \
             patch.object(main, "validate_file_path", side_effect=lambda value: value), \
             patch.object(main, "meter_audio", return_value={"true_peak": -1.2, "integrated_lufs": -14}) as measure, \
             patch.object(main, "analyze_audio") as analyze:
            result = await main.meter(main.FilePathRequest(file_path="test.wav"))
            self.assertEqual(result["true_peak"], -1.2)
            measure.assert_called_once_with("test.wav")
            analyze.assert_not_called()
            self.assertEqual(main.DSP_SLOTS._value, 1)

    async def test_unavailable_meter_values_do_not_create_response_headers(self):
        with patch.object(main, "DSP_SLOTS", asyncio.Semaphore(1)), \
             patch.object(main, "validate_file_path", side_effect=lambda value: value), \
             patch.object(main, "render_codec", return_value=(b"encoded", "audio/mp4", {"true_peak": None, "integrated_lufs": None})):
            response = await main.codec_preview(main.CodecPreviewRequest(file_path="test.wav", codec="aac256"))
        self.assertNotIn("X-Encoded-True-Peak", response.headers)
        self.assertNotIn("X-Encoded-LUFS", response.headers)
