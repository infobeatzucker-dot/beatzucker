import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from codec_preview import parse_meter_report, render_codec, meter_audio, run_process, validate_audio
from silence_normalizer import measure

FFMPEG = shutil.which(os.environ.get("FFMPEG_BINARY", "ffmpeg"))


class CodecPreviewTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.source = Path(self.directory.name) / "source.wav"
        t = np.arange(48000 * 3, dtype=np.float32) / 48000
        tone = (.2 * np.sin(2 * np.pi * 997 * t)).astype(np.float32)
        self.audio = np.stack([tone, -tone], axis=1)
        sf.write(self.source, self.audio, 48000, subtype="PCM_24")

    def test_report_uses_input_measurements_not_processed_output(self):
        report = parse_meter_report('log text\n{"input_i":"-21.42","input_tp":"-4.36","output_i":"-14","output_tp":"-1"}\n')
        self.assertEqual(report, {"integrated_lufs": -21.42, "true_peak": -4.36})

    def test_silence_and_nonfinite_values_are_not_reported_as_zero(self):
        self.assertEqual(parse_meter_report('{"input_i":"-inf","input_tp":"-inf"}'), {"integrated_lufs": None, "true_peak": None})

    def test_missing_or_invalid_measurements_are_rejected(self):
        for log in ["bad response", '{"output_i":"-14","output_tp":"-1"}', '{"input_i":"wrong","input_tp":"1"}']:
            with self.assertRaises(ValueError):
                parse_meter_report(log)

    def test_unsupported_codec_does_not_start_a_process(self):
        with patch("codec_preview.subprocess.run") as run:
            with self.assertRaises(ValueError):
                render_codec(self.source, "__proto__")
            run.assert_not_called()

    def test_audio_limits_reject_before_encoding(self):
        for channels, rate, duration in [(3, 48000, 2), (2, 384000, 2), (2, 48000, 601), (2, 48000, float("nan"))]:
            with patch("codec_preview.sf.info", return_value=SimpleNamespace(channels=channels, samplerate=rate, duration=duration)):
                with self.assertRaises(ValueError):
                    validate_audio(self.source)

    def test_expired_deadline_does_not_start_ffmpeg(self):
        with patch("codec_preview.subprocess.run") as run:
            with self.assertRaises(subprocess.TimeoutExpired):
                run_process(["ffmpeg"], time.monotonic() - 1)
            run.assert_not_called()

    def test_excessive_diagnostics_are_bounded_and_process_is_stopped(self):
        with self.assertRaises(ValueError):
            run_process([sys.executable, "-c", "import sys; sys.stderr.write('x' * 2097152)"], time.monotonic() + 10)

    def test_running_process_timeout_is_enforced(self):
        with self.assertRaises(subprocess.TimeoutExpired):
            run_process([sys.executable, "-c", "import time; time.sleep(10)"], time.monotonic() + .2)

    def test_failed_encoding_removes_worker_temp_directory_not_source(self):
        real_temp_directory = tempfile.TemporaryDirectory
        generated = []
        def directory(*args, **kwargs):
            value = real_temp_directory(dir=self.directory.name, prefix="codec-test-")
            generated.append(value.name)
            return value
        with patch("codec_preview.tempfile.TemporaryDirectory", side_effect=directory), \
             patch("codec_preview.run_process", side_effect=subprocess.CalledProcessError(1, "ffmpeg")):
            with self.assertRaises(subprocess.CalledProcessError):
                render_codec(self.source, "aac256")
        self.assertTrue(self.source.exists())
        self.assertTrue(generated)
        self.assertFalse(any(Path(directory).exists() for directory in generated))

    @unittest.skipUnless(FFMPEG, "Portable/system FFmpeg required for actual codec test")
    def test_real_mp3_and_aac_outputs_and_actual_encoded_measurements(self):
        ffprobe = str(Path(FFMPEG).with_name("ffprobe.exe" if os.name == "nt" else "ffprobe"))
        for codec, ext, expected in [("aac256", "m4a", "aac"), ("mp3320", "mp3", "mp3"), ("mp3128", "mp3", "mp3")]:
            with self.subTest(codec=codec):
                audio, mime, stats = render_codec(self.source, codec)
                output = Path(self.directory.name) / f"output-{codec}.{ext}"
                output.write_bytes(audio)
                self.assertGreater(len(audio), 100)
                probe = json.loads(subprocess.check_output([ffprobe, "-v", "error", "-select_streams", "a:0", "-show_streams", "-of", "json", str(output)], timeout=10))
                self.assertEqual(probe["streams"][0]["codec_name"], expected)
                self.assertEqual(probe["streams"][0]["channels"], 2)
                self.assertEqual(stats, meter_audio(output, validate=False))
                self.assertTrue(np.isfinite(stats["true_peak"]))
                self.assertTrue(np.isfinite(stats["integrated_lufs"]))
                self.assertEqual(mime, "audio/mp4" if codec == "aac256" else "audio/mpeg")

    @unittest.skipUnless(FFMPEG, "Portable/system FFmpeg required for actual meter test")
    def test_streaming_meter_agrees_with_independent_pcm_meter(self):
        measured = meter_audio(self.source)
        reference = measure(self.audio, 48000)
        self.assertAlmostEqual(measured["integrated_lufs"], reference["integrated_lufs"], delta=.15)
        self.assertAlmostEqual(measured["true_peak"], reference["true_peak"], delta=.15)

    @unittest.skipUnless(FFMPEG, "Portable/system FFmpeg required for actual encoding test")
    def test_optional_measurement_failure_keeps_codec_but_never_fakes_peak(self):
        with patch("codec_preview.meter_audio", side_effect=ValueError("simulated unavailable")):
            audio, _, stats = render_codec(self.source, "mp3128")
        self.assertGreater(len(audio), 100)
        self.assertIsNone(stats["true_peak"])
        self.assertIsNone(stats["integrated_lufs"])
