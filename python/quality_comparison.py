"""Private, level-matched blind comparisons against the pre-change DSP.

Reads local audio only. Outputs are excluded QA artefacts, never public assets.
Listening decisions are intentionally left to the human listener.
"""
import argparse
import html
import json
import os
import secrets
import subprocess
import sys
import types
from dataclasses import asdict
from pathlib import Path

import numpy as np
import pyloudnorm as pyln
import soundfile as sf

from ai_params import get_mastering_params
from analyzer import analyze_audio, analysis_to_dict, compute_true_peak
from mastering import master_audio

ROOT = Path(__file__).resolve().parents[1]


def old_module(filename, name):
    source = subprocess.run(["git", "show", f"1e791f7:python/{filename}"], cwd=ROOT, capture_output=True, text=True, encoding="utf-8", check=True).stdout
    module = types.ModuleType(name); module.__file__ = str(ROOT / "python" / filename)
    sys.modules[name] = module
    exec(compile(source, module.__file__, "exec"), module.__dict__)
    return module


def metrics(audio, sr):
    return {"integrated_lufs": float(pyln.Meter(sr).integrated_loudness(audio.T)), "true_peak": float(compute_true_peak(audio, sr)),
            "sample_peak": float(np.max(np.abs(audio))), "finite": bool(np.all(np.isfinite(audio)))}


def main():
    parser = argparse.ArgumentParser(); parser.add_argument("--source", action="append", required=True); parser.add_argument("--seconds", type=float, default=20)
    args = parser.parse_args()
    if not .4 <= args.seconds <= 30: raise ValueError("Use 0.4–30 seconds")
    output = ROOT / "validation-output" / "mastering-quality-20261017" / secrets.token_hex(4)
    output.mkdir(parents=True, exist_ok=False)
    old_ai, old_dsp = old_module("ai_params.py", "baseline_ai"), old_module("mastering.py", "baseline_dsp")
    cases = []; keys = {}; cards = []
    for number, filename in enumerate(args.source, 1):
        source = Path(filename).resolve(); info = sf.info(source)
        start = max(0, (info.duration - args.seconds) * .5)
        audio, sr = sf.read(source, start=int(start*info.samplerate), frames=int(args.seconds*info.samplerate), dtype="float32", always_2d=True)
        case = output / f"case-{number}"; case.mkdir()
        excerpt = case / "source.wav"; sf.write(excerpt, audio, sr, subtype="FLOAT")
        analysis = analysis_to_dict(analyze_audio(str(excerpt)))
        old_params = old_ai.get_mastering_params(analysis, platform="spotify", intensity=65)
        new_params = get_mastering_params(analysis, platform="spotify", intensity=65)
        before = old_dsp.master_audio(str(excerpt), old_params, str(case/"baseline"), selected_format="wav24", pre_analysis=analysis)
        after = master_audio(str(excerpt), new_params, str(case/"candidate"), selected_format="wav24", pre_analysis=analysis)
        signals = {}; details = {}
        for name,result in (("baseline",before),("candidate",after)):
            data, rate = sf.read(result.paths["wav24"], dtype="float32", always_2d=True); data = data.T
            if rate != sr or data.shape[-1] != len(audio): raise AssertionError("Rate/length changed")
            details[name] = metrics(data,sr)
            if not details[name]["finite"] or details[name]["true_peak"] > -.9: raise AssertionError("Unsafe render")
            signals[name] = data * 10**((-20-details[name]["integrated_lufs"])/20)
        # One shared attenuation if needed: equal loudness must not be undone by
        # separate peak normalization of A and B.
        peak = max(compute_true_peak(data,sr) for data in signals.values())
        trim = min(0,-1.1-peak)
        mapping = ["baseline","candidate"]
        if secrets.randbits(1): mapping.reverse()
        for label,name in zip(("A","B"),mapping):
            matched = signals[name] * 10**(trim/20)
            sf.write(case/f"{label}.wav",matched.T,sr,subtype="FLOAT")
            details[name]["audition"] = metrics(matched,sr)
        self_difference = abs(details["baseline"]["audition"]["integrated_lufs"]-details["candidate"]["audition"]["integrated_lufs"])
        if self_difference > .02: raise AssertionError("Audition loudness mismatch")
        keys[f"case-{number}"] = dict(zip(("A","B"),mapping))
        cases.append({"case":number,"source":str(source),"start":start,"seconds":len(audio)/sr,"rate":sr,"metrics":details,"candidate_params":asdict(new_params)})
        cards.append(f'<section><h2>Vergleich {number}</h2><p>Pegelangepasst; höre auf Basskontur, Stimmen/S-Laute, Transienten und Stereobild. Nicht allein nach Lautstärke urteilen.</p><label>A<audio controls preload="metadata" src="case-{number}/A.wav"></audio></label><label>B<audio controls preload="metadata" src="case-{number}/B.wav"></audio></label><p>Deine Wahl: A / B / kein Unterschied. Notiere auch die gehörte Stelle.</p></section>')
        print(f"PASS comparison {number}: finite WAV24, preserved duration/rate, true peak safe; audition difference {self_difference:.4f} LU", flush=True)
    (output/"measurements.json").write_text(json.dumps({"baseline":"1e791f7","subjective_listening":"not performed; human review required","cases":cases},indent=2,ensure_ascii=False),encoding="utf-8")
    (output/"reveal.json").write_text(json.dumps(keys,indent=2),encoding="utf-8")
    (output/"index.html").write_text('<!doctype html><html lang="de"><meta charset="utf-8"><title>Privater Mastering-Hörvergleich</title><style>body{background:#090d1c;color:#e2e8f0;font:16px system-ui;max-width:900px;margin:40px auto;padding:20px}section{background:#121b31;padding:24px;border:1px solid #334155;border-radius:16px;margin:20px 0}audio{display:block;width:100%;margin:10px 0 20px}p{color:#a8b5ce;line-height:1.6}</style><h1>Pegelangepasster Blindvergleich</h1><p>Nur lokale, private Testausschnitte. A/B ist pro Vergleich zufällig zugeordnet. Erst hören, danach optional reveal.json zur Auflösung öffnen. Kein Nachweis einer subjektiven Qualitätsverbesserung ohne deine Bewertung.</p>'+''.join(cards)+'<script>document.querySelectorAll("audio").forEach(a=>a.onplay=()=>document.querySelectorAll("audio").forEach(b=>{if(a!==b)b.pause()}))</script></html>',encoding="utf-8")
    print("PRIVATE comparison: " + str(output/"index.html"),flush=True)


if __name__ == "__main__": main()
