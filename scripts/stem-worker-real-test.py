"""Actual model + private queue HTTP integration, local disposable files only."""
import importlib.util
import os
import tempfile
import time
from pathlib import Path

if os.environ.get("BEATZUCKER_ISOLATED_QA") != "1":
    raise RuntimeError("Requires isolated QA flag")
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "validation-output" / "stem-integration"
OUT.mkdir(parents=True, exist_ok=True)
os.environ["HF_HOME"] = str(ROOT / "validation-output/stem-benchmark-20261018/model-cache")
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["PATH"] = str(ROOT / "validation-output/codec-test-runtime/portable/ffmpeg-9.0.2-essentials_build/bin") + os.pathsep + os.environ["PATH"]
os.environ["STEM_WORKER_SECRET"] = "isolated-qa-not-for-production-123456789"
import numpy as np
import soundfile as sf
from fastapi.testclient import TestClient

with tempfile.TemporaryDirectory(prefix="real-", dir=OUT) as directory:
    os.environ["STEM_DATA_DIR"] = directory
    spec = importlib.util.spec_from_file_location("stem_real_service", ROOT / "stem-worker/service.py")
    service = importlib.util.module_from_spec(spec); spec.loader.exec_module(service)
    audio, sr = sf.read("D:/Music/VÖ Februar 2026/WOLLE/On Tour.wav", frames=22*44100, dtype="float32", always_2d=True)
    headers = {"Authorization": "Bearer " + service.SECRET, "X-Owner": "c"*64}
    with TestClient(service.app) as client:
        for mode, frames in [("preview", len(audio)), ("full", sr*2)]:
            source = Path(directory) / "fixture.wav"
            sf.write(source, audio[:frames], sr, subtype="PCM_16")
            started = time.monotonic()
            response = client.post("/jobs", headers=headers, data={"mode": mode,"tool":"stem-separation"}, files={"file":("source.wav",source.read_bytes())})
            assert response.status_code == 202, response.text
            job_id = response.json()["id"]
            while time.monotonic()-started < 180:
                state = client.get(f"/jobs/{job_id}",headers=headers).json()
                if state["status"] in ("done", "error"):
                    break
                time.sleep(1)
            assert state["status"] == "done", (state, (Path(directory)/job_id/"worker.log").read_text(errors="replace"))
            for stem in state["stems"]:
                response = client.get(f"/jobs/{job_id}/audio/{stem}",headers=headers)
                assert response.status_code == 200
                result, output_sr = sf.read(Path(directory)/job_id/f"{stem}.wav",always_2d=True)
                assert np.isfinite(result).all() and result.shape[1] == 2
                expected = 20 if mode == "preview" else 2
                assert abs(len(result)/output_sr-expected)<.02
            assert not (Path(directory)/job_id/"source").exists()
            assert client.get(f"/jobs/{job_id}/audio/instrumental",headers=headers).status_code == 404
            assert client.get(f"/jobs/{job_id}/audio/vocals",headers={**headers,"X-Owner":"d"*64}).status_code == 404
            print(f"PASS actual {mode}: four private finite stereo WAVs, {expected}s, {time.monotonic()-started:.1f}s processing",flush=True)
