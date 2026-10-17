"""Quality regressions A–E: not only ceilings but transparent routing and parity."""
import io
import json
import subprocess
import sys
import tempfile
import unittest
from dataclasses import asdict
from pathlib import Path
from unittest.mock import patch

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python"))
from ai_params import MasteringParams, get_mastering_params
from analyzer import measure_bass_stereo, compute_true_peak
from mastering import (linkwitz_riley_crossover, crossover_allpass, split_mastering_bands,
                       apply_deesser, apply_multiband_compression, apply_ms_processing,
                       apply_bus_compression, compress_band, process_mastering_audio)
from control_preview import render_control
from test_adaptive_params import analysis


class MasteringRevisionTests(unittest.TestCase):
    def test_eighty_hz_means_eighty_at_every_source_rate(self):
        for sr in (8000, 44100, 48000, 96000, 192000):
            t = np.arange(sr) / sr
            tone = (.001 * np.sin(2 * np.pi * 80 * t)).astype(np.float32)
            low, high = linkwitz_riley_crossover(tone, sr, 80)
            gain = 20 * np.log10(np.std(low[sr//2:]) / np.std(tone[sr//2:]))
            self.assertAlmostEqual(float(gain), -6.0206, delta=.005)

    def test_allpass_is_the_actual_lr_sum(self):
        rng = np.random.default_rng(22)
        audio = rng.normal(0, .01, (2, 48000)).astype(np.float32)
        for frequency in (80, 500, 5000, 9000):
            lo, hi = linkwitz_riley_crossover(audio, 48000, frequency)
            np.testing.assert_allclose(lo + hi, crossover_allpass(audio, 48000, frequency), atol=2e-8)

    def test_full_four_band_recombination_is_flat(self):
        for sr in (8000, 44100, 48000, 96000):
            impulse = np.zeros(sr, np.float32); impulse[0] = 1
            result = sum(split_mastering_bands(impulse, sr))
            magnitude = np.abs(np.fft.rfft(result))
            freqs = np.fft.rfftfreq(len(result), 1/sr)
            selected = magnitude[(freqs >= 20) & (freqs <= sr * .45)]
            self.assertLess(float(np.max(np.abs(20 * np.log10(selected)))), .002)

    def test_non_compressing_deesser_has_flat_magnitude(self):
        sr = 48000
        impulse = np.zeros(sr, np.float32); impulse[0] = .0001
        result = apply_deesser(impulse, sr, ratio=1)
        response = np.abs(np.fft.rfft(result)) / .0001
        self.assertLess(float(np.max(np.abs(20 * np.log10(response[20:20000])))), .002)

    def test_reference_and_source_gain_do_not_change_decisions(self):
        source, reference = analysis(), analysis(rms_sub=-40, rms_mid=-34, rms_high=-35, rms_air=-55)
        original = get_mastering_params(source, reference_analysis=reference)
        for source_gain, reference_gain in ((12, 0), (0, 12), (-12, 7)):
            def shifted(data, gain):
                return {key: value + gain if key.startswith("rms_") or key in ("integrated_lufs", "true_peak") else value for key, value in data.items()}
            actual = get_mastering_params(shifted(source, source_gain), reference_analysis=shifted(reference, reference_gain))
            self.assertEqual(asdict(actual), asdict(original))

    def test_missing_reference_band_does_not_invent_sub_correction(self):
        partial = {"spectral_centroid": 2600, "rms_sub": -40}
        # Missing mid must not make an absolute sub reading into a tonal target.
        params = get_mastering_params(analysis(), reference_analysis=partial)
        baseline = get_mastering_params(analysis(), reference_analysis={**partial, "rms_sub": -20})
        self.assertEqual(params.mb_sub_ratio, baseline.mb_sub_ratio)

    def test_dense_sources_receive_less_processing_and_content_release(self):
        normal = get_mastering_params(analysis(), preset="edm")
        dense = get_mastering_params(analysis(lra=3, crest_factor=6), preset="edm")
        self.assertLess(dense.mb_sub_ratio, normal.mb_sub_ratio)
        self.assertLess(dense.saturation_amount, normal.saturation_amount)
        self.assertGreater(dense.release_scale, normal.release_scale)
        self.assertLess(get_mastering_params(analysis(crest_factor=15)).release_scale, normal.release_scale)

    def test_bass_stereo_is_measured_and_preserved_unless_problematic(self):
        sr = 48000; t = np.arange(sr)/sr
        low = (.1*np.sin(2*np.pi*65*t)).astype(np.float32)
        safe = np.stack([low, low]); unsafe = np.stack([low, -low])
        for audio, should_narrow in ((safe, False), (unsafe, True)):
            corr, ratio = measure_bass_stereo(audio, sr)
            params = get_mastering_params(analysis(bass_correlation=corr, bass_side_ratio=ratio))
            self.assertEqual(params.bass_mono_amount > 0, should_narrow)
        p = MasteringParams(stereo_width=1, bass_mono_amount=0)
        np.testing.assert_allclose(apply_ms_processing(unsafe, sr, p), unsafe, atol=3e-8)
        self.assertEqual(get_mastering_params(analysis(), preset="classical").bass_mono_amount, 0)

    def test_soft_knee_is_continuous_and_reduction_stays_bounded(self):
        sr = 8000; reductions = []
        for level in (-23.01, -23, -22.99, -20, -17.01, -17, -16.99, -6):
            signal = np.full(sr, 10**(level/20), np.float32)
            out = compress_band(signal, sr, -20, 4, attack_ms=.1, knee_db=6, max_reduction_db=3)
            reductions.append(float(-20*np.log10(out[-1]/signal[-1])))
        self.assertLess(max(abs(reductions[i+1]-reductions[i]) for i in (0,1,4,5)), .02)
        self.assertGreater(reductions[3], 0)
        self.assertLessEqual(max(reductions), 3.001)

    def test_manual_changes_are_honoured_even_after_zero_intensity(self):
        p = get_mastering_params(analysis(), intensity=0, overrides={"low_shelf_gain": 2})
        self.assertTrue(p.manual_active)
        unchanged = get_mastering_params(analysis(), intensity=0, overrides={"low_shelf_gain": 0})
        self.assertFalse(unchanged.manual_active)
        audio = np.full((2, 8000), .1, np.float32)
        with patch("mastering.apply_correction_eq", side_effect=lambda data,*_: data) as eq:
            process_mastering_audio(audio, 8000, p)
            eq.assert_called_once()

    def test_worklet_dynamics_match_python_not_browser_compressor_defaults(self):
        sr = 48000; t = np.arange(8192)/sr
        audio = np.stack([.25*np.sin(2*np.pi*997*t)+.08*np.sin(2*np.pi*6700*t), .2*np.sin(2*np.pi*997*t+.3)]).astype(np.float32)
        p = get_mastering_params(analysis(), overrides={"bass_mono_amount": .4})
        actual = apply_deesser(audio, sr, ratio=1+1.5*p.processing_intensity/100)
        actual = apply_multiband_compression(actual, sr, p)
        actual = apply_ms_processing(actual, sr, p)
        for mode, expected in (("bands", actual), ("bus", apply_bus_compression(audio, sr, p))):
            request = json.dumps({"rate": sr, "mode": mode, "params": asdict(p), "channels": audio.tolist()})
            result = subprocess.run(["node", str(ROOT/"scripts/mastering-worklet-probe.cjs")], input=request, text=True, capture_output=True, check=True)
            np.testing.assert_allclose(np.array(json.loads(result.stdout)), expected, atol=3e-6, rtol=2e-5)

    def test_control_render_is_bounded_and_uses_real_chain(self):
        sr = 16000; t = np.arange(sr*2)/sr
        source = .2*np.sin(2*np.pi*220*t)
        with tempfile.TemporaryDirectory() as directory:
            file = str(Path(directory)/"source.wav"); sf.write(file, source, sr, subtype="FLOAT")
            for start,end in ((-1,1), (0,100), (float("nan"),1), (0,.1), (1,3)):
                with self.assertRaises(ValueError): render_control(file,start,end,analysis(),"spotify","auto",65,None,None,{})
            output = render_control(file,.5,1.5,analysis(),"spotify","auto",65,None,None,{"low_shelf_gain":1})
            audio, rate = sf.read(io.BytesIO(output), dtype="float32", always_2d=True)
            self.assertEqual(rate,sr); self.assertEqual(audio.shape,(sr,2)); self.assertTrue(np.all(np.isfinite(audio)))
            self.assertLessEqual(compute_true_peak(audio.T,sr),-.9)
            np.testing.assert_allclose(sf.read(file)[0], source, atol=2e-8)


if __name__ == "__main__": unittest.main()
