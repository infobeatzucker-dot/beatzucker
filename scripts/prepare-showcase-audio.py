"""Prepare public, aligned audition excerpts. Never changes source files or DSP.

Both audition sides use the same MP3 320 encoder settings, tiny boundary fades
and no EQ/compression/loudness normalization. Metrics describe decoded previews,
not full tracks. Private provenance stays in ignored validation-output.
"""
import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy import signal

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "python"))
from analyzer import compute_true_peak


def match_anchor(a, b, center, rate):
    anchor = a[center:center + 4 * rate:8].astype(np.float64)
    radius = rate // 4
    search = b[center-radius:center+4*rate+radius:8].astype(np.float64)
    corr = signal.correlate(search, anchor, mode="valid", method="fft")
    energy = signal.fftconvolve(search ** 2, np.ones(len(anchor)), mode="valid")
    score = corr / np.sqrt(np.maximum(energy * np.sum(anchor ** 2), 1e-20))
    index = int(np.argmax(score))
    return index * 8 - radius, float(score[index])


def prepare(original, master, title, slug, genre, start, ffmpeg, out, provenance):
    sources = [Path(original).resolve(strict=True), Path(master).resolve(strict=True)]
    arrays = []
    for source in sources:
        result = subprocess.run([ffmpeg, "-v", "error", "-i", str(source), "-t", "600", "-f", "f32le", "-ar", "48000", "-ac", "2", "pipe:1"], capture_output=True, check=True)
        arrays.append(np.frombuffer(result.stdout, dtype="<f4").reshape(-1, 2))
    rate, seconds = 48000, 24
    a, b = arrays
    if min(len(a), len(b)) / rate < start + seconds + 1:
        raise ValueError("Source too short for approved excerpt")
    # Match a four-second anchor within +/- 0.25 seconds, with normalized FFT
    # correlation. Positive offset means the master starts later than original.
    center = int((start + 8) * rate)
    mono_a, mono_b = a.mean(axis=1), b.mean(axis=1)
    offset, correlation = match_anchor(mono_a, mono_b, center, rate)
    alignment = {"method": "broadband", "broadbandCorrelation": correlation}
    if correlation < .65:
        # Mastering can change broadband phase/tonal balance. Validate two
        # independent low-band anchors instead; NEVER filter the published audio.
        sos = signal.butter(4, 1000, fs=rate, output="sos")
        low_a, low_b = (signal.sosfiltfilt(sos, mono) for mono in (mono_a, mono_b))
        matches = [match_anchor(low_a, low_b, int((start + at) * rate), rate) for at in (8, 16)]
        if min(score for _, score in matches) < .65 or abs(matches[0][0] - matches[1][0]) > rate * .002:
            raise ValueError(f"Pair alignment uncertain: {title}: {correlation:.3f}; anchors={matches}")
        offset = int(round(float(np.median([lag for lag, _ in matches]))))
        correlation = min(score for _, score in matches)
        alignment.update(method="two-low-band-anchors", anchors=matches)
    rows = []
    record = {"title": title, "alignmentSamples": offset, "alignmentCorrelation": correlation, "alignment": alignment, "sources": []}
    for side, source, audio, delta in zip(("original", "master"), sources, arrays, (0, offset)):
        excerpt = audio[int(start * rate)+delta:int((start+seconds)*rate)+delta].copy()
        fade = int(rate * .012)
        ramp = np.linspace(0, 1, fade, dtype=np.float32)
        excerpt[:fade] *= ramp[:, None]; excerpt[-fade:] *= ramp[::-1, None]
        fingerprint = hashlib.sha256(excerpt.tobytes()).hexdigest()[:12]
        filename = f"{slug}-{side}-{fingerprint}.mp3"
        target = out / filename
        # Only this explicitly named generated preview is written.
        subprocess.run([ffmpeg, "-v", "error", "-y", "-f", "f32le", "-ar", str(rate), "-ac", "2", "-i", "pipe:0", "-map_metadata", "-1", "-c:a", "libmp3lame", "-b:a", "320k", str(target)], input=excerpt.astype("<f4").tobytes(), check=True)
        decoded = subprocess.run([ffmpeg, "-v", "error", "-i", str(target), "-f", "f32le", "-ar", str(rate), "-ac", "2", "pipe:1"], capture_output=True, check=True)
        samples = np.frombuffer(decoded.stdout, dtype="<f4").reshape(-1, 2)
        rms = float(np.sqrt(np.mean(samples.astype(np.float64) ** 2)))
        peak = float(np.max(np.abs(samples)))
        metrics = {"lufs": round(float(pyln.Meter(rate).integrated_loudness(samples)), 2), "truePeak": round(float(compute_true_peak(samples.T, rate)), 2), "crest": round(float(20 * np.log10(max(peak, 1e-12) / max(rms, 1e-12))), 2)}
        waveform = [round(float(np.max(np.abs(block))), 5) for block in np.array_split(samples, 128)]
        rows.append({"url": "/audio/showcase/" + filename, "bytes": target.stat().st_size, "duration": len(samples) / rate, "metrics": metrics, "waveform": waveform})
        record[side] = metrics
        record["sources"].append({"path": str(source), "sha256": hashlib.sha256(source.read_bytes()).hexdigest()})
    provenance.append(record)
    print(json.dumps({"track": title, "start": start, "offsetSamples": offset, "correlation": round(correlation, 4), "alignment": alignment, "original": rows[0]["metrics"], "master": rows[1]["metrics"]}))
    return {"id": slug, "title": title, "genre": genre, "sourceStart": start, "duration": seconds, "original": rows[0], "master": rows[1]}


def main():
    parser = argparse.ArgumentParser()
    for name in ("ffmpeg",):
        parser.add_argument("--" + name, required=True)
    for name in ("xplore-original", "xplore-master", "acid-original", "acid-master", "lass-original", "lass-master", "tour-original", "tour-master"):
        parser.add_argument("--" + name)
    args = parser.parse_args()
    out = ROOT / "public/audio/showcase"; out.mkdir(parents=True, exist_ok=True)
    private = ROOT / "validation-output/showcase"; private.mkdir(parents=True, exist_ok=True)
    provenance = []
    existing = out / "manifest.json"
    tracks = json.loads(existing.read_text(encoding="utf-8"))["tracks"] if existing.exists() else []
    for original, master, title, slug, genre, start in [
        (args.lass_original, args.lass_master, "Lass mich nicht allein", "lass-mich-nicht-allein", "Original / Master", 48),
        (args.acid_original, args.acid_master, "Back to My Acid", "back-to-my-acid", "Electronic / Club", 120),
        (args.tour_original, args.tour_master, "On Tour", "on-tour", "Pop / Club", 48),
        (args.xplore_original, args.xplore_master, "Xplore Belgium", "xplore-belgium", "Pop", 48),
    ]:
        if bool(original) != bool(master):
            parser.error(f"Both original and master are required for {title}")
        if original:
            item = prepare(original, master, title, slug, genre, start, args.ffmpeg, out, provenance)
            tracks = [track for track in tracks if track["id"] != slug] + [item]
    order = ["lass-mich-nicht-allein", "back-to-my-acid", "on-tour", "xplore-belgium"]
    tracks.sort(key=lambda track: order.index(track["id"]))
    manifest = {"version": 1, "previewFormat": "MP3 320 kbps", "sampleRate": 48000, "sourceFormats": {"original": "WAV 16-bit", "master": "MP3 320 kbps"}, "tracks": tracks}
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    history = private / "provenance.json"
    previous = json.loads(history.read_text(encoding="utf-8")) if history.exists() else []
    titles = {item["title"] for item in provenance}
    history.write_text(json.dumps([item for item in previous if item["title"] not in titles] + provenance, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
