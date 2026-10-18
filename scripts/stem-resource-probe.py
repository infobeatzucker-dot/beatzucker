"""Isolated local source-separation benchmark. Never run automatically during deploy."""
import argparse
import json
import os
from pathlib import Path
import platform
import subprocess
import sys
import time


def worker(args):
    import importlib.metadata
    import numpy as np
    import psutil
    import soundfile as sf
    import torch
    from demucs.api import Separator

    torch.set_num_threads(args.threads)
    torch.set_num_interop_threads(1)
    process = psutil.Process()
    if hasattr(process, "cpu_affinity"):
        available = process.cpu_affinity()
        process.cpu_affinity(available[:args.threads])
    started = time.perf_counter()
    # Explicit hf:// prevents fallback to legacy pickle checkpoints.
    separator = Separator(model="hf://htdemucs", device="cpu", shifts=1, overlap=.25,
                          segment=7.8, jobs=0, progress=False)
    load_seconds = time.perf_counter() - started
    print(json.dumps({"event": "model_ready", "seconds": load_seconds}), flush=True)
    audio_started = time.perf_counter()
    audio, sr = sf.read(args.input, dtype="float32", always_2d=True)
    if audio.shape[1] != 2:
        raise ValueError("Benchmark requires an existing stereo source")
    if args.seconds:
        start = min(int(sr * 45), max(0, len(audio) - int(sr * args.seconds)))
        audio = audio[start:start + int(sr * args.seconds)]
    source_seconds = len(audio) / sr
    tensor = torch.from_numpy(np.ascontiguousarray(audio.T))
    decode_seconds = time.perf_counter() - audio_started
    del audio
    calls = [0]
    def progress(data):
        if data.get("state") == "end":
            calls[0] += 1
            print(json.dumps({"event": "segment_done", "count": calls[0]}), flush=True)
    separator.update_parameter(callback=progress)
    inference_started = time.perf_counter()
    with torch.inference_mode():
        original, stems = separator.separate_tensor(tensor, sr=sr)
    inference_seconds = time.perf_counter() - inference_started
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    export_started = time.perf_counter()
    peaks = {}
    for name, samples in stems.items():
        arr = samples.cpu().numpy().T
        if not np.isfinite(arr).all():
            raise ValueError("Nonfinite separation output")
        peaks[name] = float(np.max(np.abs(arr)))
        # Float output preserves measured model levels without independent stem normalization.
        sf.write(output / f"{name}.wav", arr, separator.samplerate, subtype="FLOAT")
    instrumental = sum(stems[name] for name in stems if name != "vocals")
    sf.write(output / "instrumental.wav", instrumental.cpu().numpy().T,
             separator.samplerate, subtype="FLOAT")
    reconstruction = sum(stems.values())
    residual = float(torch.sqrt(torch.mean((original - reconstruction) ** 2)))
    print(json.dumps({"event": "result", "source": Path(args.input).name,
                      "source_seconds": source_seconds, "model": "hf://htdemucs",
                      "threads": args.threads, "segment_seconds": 7.8, "shifts": 1,
                      "overlap": .25, "model_load_seconds": load_seconds,
                      "decode_seconds": decode_seconds, "inference_seconds": inference_seconds,
                      "export_seconds": time.perf_counter() - export_started,
                      "real_time_factor": inference_seconds / source_seconds,
                      "output_bytes": sum(p.stat().st_size for p in output.glob("*.wav")),
                      "stem_peaks": peaks, "reconstruction_rms_error": residual,
                      "versions": {name: importlib.metadata.version(name) for name in
                                   ["torch", "demucs", "numpy", "psutil", "safetensors"]}}), flush=True)


def monitor(args):
    import psutil
    output = Path(args.output).resolve()
    if "validation-output" not in output.parts:
        raise ValueError("Output must stay in an isolated validation-output directory")
    output.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ)
    cache = output.parent / "model-cache"
    env.update(HF_HOME=str(cache), TORCH_HOME=str(cache / "torch"),
               HF_HUB_DISABLE_TELEMETRY="1", HF_HUB_DISABLE_XET="1",
               HF_HUB_DISABLE_SYMLINKS_WARNING="1", OMP_NUM_THREADS=str(args.threads),
               MKL_NUM_THREADS=str(args.threads))
    command = [sys.executable, __file__, "--worker", "--input", args.input,
               "--output", str(output), "--seconds", str(args.seconds),
               "--threads", str(args.threads)]
    started = time.perf_counter()
    with (output / "worker.log").open("w", encoding="utf-8") as log:
        child = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT, env=env)
        process = psutil.Process(child.pid)
        peak_rss = peak_private = cpu_seconds = 0
        cpu_by_pid = {}
        peak_process_count = 0
        stopped = None
        last_notice = 0
        while child.poll() is None:
            try:
                # Windows venv python.exe may be a tiny launcher with a real interpreter child.
                # Sampling the launcher alone reports bogus ~3 MiB for a large torch workload.
                members = [process] + process.children(recursive=True)
                rss = private = 0
                peak_process_count = max(peak_process_count, len(members))
                for member in members:
                    try:
                        memory = member.memory_info()
                        rss += memory.rss
                        private += getattr(memory, "private", memory.rss)
                        cpu = member.cpu_times()
                        cpu_by_pid[member.pid] = cpu.user + cpu.system
                    except psutil.NoSuchProcess:
                        pass
                peak_rss = max(peak_rss, rss)
                peak_private = max(peak_private, private)
                cpu_seconds = sum(cpu_by_pid.values())
                elapsed = time.perf_counter() - started
                if rss > args.max_mib * 1024 ** 2:
                    stopped = "rss_guard"
                elif elapsed > args.timeout:
                    stopped = "timeout_guard"
                if stopped:
                    for member in reversed(members):
                        try:
                            member.kill()
                        except psutil.NoSuchProcess:
                            pass
                if elapsed - last_notice >= 20:
                    last_notice = elapsed
                    print(json.dumps({"event": "monitor", "seconds": round(elapsed, 1),
                                      "rss_mib": round(rss / 1024 ** 2, 1)}), flush=True)
            except psutil.NoSuchProcess:
                break
            time.sleep(.05)
        child.wait()
    report = {"status": stopped or ("ok" if child.returncode == 0 else "failed"),
              "exit_code": child.returncode, "elapsed_seconds": time.perf_counter() - started,
              "peak_rss_mib": peak_rss / 1024 ** 2,
              "peak_private_mib": peak_private / 1024 ** 2,
              "cpu_seconds": cpu_seconds, "memory_guard_mib": args.max_mib,
              "measurement_scope": "complete_process_tree", "peak_process_count": peak_process_count,
              "host": {"os": platform.platform(), "cpu": platform.processor(),
                       "logical_cpus": os.cpu_count(), "ram_gib": psutil.virtual_memory().total / 1024 ** 3},
              "audio_uploaded": False, "production_touched": False}
    lines = (output / "worker.log").read_text(encoding="utf-8", errors="replace").splitlines()
    for line in lines:
        try:
            item = json.loads(line)
            if item.get("event") == "result":
                report["measurement"] = item
        except ValueError:
            pass
    (output / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report), flush=True)
    return 0 if report["status"] == "ok" else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--worker", action="store_true")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--seconds", type=float, default=20)
    parser.add_argument("--threads", type=int, default=2)
    parser.add_argument("--max-mib", type=int, default=2560)
    parser.add_argument("--timeout", type=float, default=1800)
    options = parser.parse_args()
    if options.worker:
        worker(options)
    else:
        sys.exit(monitor(options))
