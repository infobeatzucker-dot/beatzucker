"""Offline pre-deploy DSP test. Generated audio only; no DB, mail or user files."""
import json
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

from ai_params import get_mastering_params
from analyzer import analyze_audio, analysis_to_dict, compute_true_peak
from codec_preview import render_codec
from mastering import master_audio, load_and_verify_export


def run_self_test():
    sr = 48000
    t = np.arange(sr * 4, dtype=np.float32) / sr
    left = .2 * np.sin(2 * np.pi * 110 * t) + .035 * np.sin(2 * np.pi * 3100 * t)
    right = .2 * np.sin(2 * np.pi * 110 * t + .03) + .035 * np.sin(2 * np.pi * 3300 * t)
    with tempfile.TemporaryDirectory(prefix="beatzucker-dsp-selftest-") as directory:
        source = Path(directory) / "generated.wav"
        sf.write(source, np.stack([left, right], axis=1), sr, subtype="PCM_24")
        analysis = analysis_to_dict(analyze_audio(str(source)))
        if not np.isfinite(analysis["integrated_lufs"]) or analysis["channels"] != 2:
            raise RuntimeError("Synthetic analysis invalid")
        params = get_mastering_params(analysis, platform="spotify", intensity=45)
        result = master_audio(str(source), params, str(Path(directory) / "masters"),
                              selected_format="wav24", pre_analysis=analysis, master_id="dsp-selftest")
        audio, rate = load_and_verify_export(result.paths["wav24"], "wav24", sr)
        if rate != sr or audio.shape[0] != 2 or not np.all(np.isfinite(audio)) or compute_true_peak(audio, rate) > -.9:
            raise RuntimeError("Synthetic master output invalid")
        for codec in ["mp3128", "aac256"]:
            encoded, _, values = render_codec(result.paths["wav24"], codec)
            if len(encoded) < 100 or not all(value is not None and np.isfinite(value) for value in values.values()):
                raise RuntimeError("Synthetic codec output invalid")
        return {"ok": True, "checks": ["analysis", "mastering", "WAV24", "true-peak", "MP3", "AAC"]}


if __name__ == "__main__":
    print(json.dumps(run_self_test()))
