"""Measured behavior and actual browser-module parity, not UI-only assertions."""
import json
import subprocess
import sys
import unittest
from pathlib import Path
import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'python'))
from dynamic_eq import apply_dynamic_eq, coefficients
from ai_params import MasteringParams, get_mastering_params
from test_adaptive_params import analysis


def fixture(sr=48000):
    t = np.arange(sr * 4) / sr
    x = .04 * np.sin(2 * np.pi * 900 * t) + .015 * np.sin(2 * np.pi * 5200 * t)
    mask = (t > 2) & (t < 2.55)
    x += mask * .16 * np.sin(2 * np.pi * 280 * t)
    x += ((t > 3) & (t < 3.5)) * .15 * np.sin(2 * np.pi * 3200 * t)
    return np.stack([x, x * .6]).astype(np.float32)


class DynamicEqTests(unittest.TestCase):
    def test_bypass_silence_shape_and_source_invariance(self):
        a = fixture(); copy = a.copy()
        np.testing.assert_array_equal(apply_dynamic_eq(a,48000,0),a)
        self.assertEqual(apply_dynamic_eq(a,48000,.65).shape,a.shape)
        np.testing.assert_array_equal(copy,a)
        z = np.zeros((2,48000),np.float32)
        np.testing.assert_array_equal(apply_dynamic_eq(z,48000,1),z)
        for value in (-1,1.1,float('nan')):
            with self.assertRaises(ValueError): apply_dynamic_eq(a,48000,value)

    def test_no_stereo_image_motion_or_phase_cancelling_detector(self):
        a = fixture(); a[1] = -a[0] * .6
        y = apply_dynamic_eq(a,48000,1)
        np.testing.assert_allclose(y[1],-y[0]*.6,atol=3e-8)
        self.assertGreater(float(np.max(np.abs(y-a))),.001)

    def test_bursts_reduced_but_steady_timbre_not_permanently_cut(self):
        sr=48000; a=fixture();y=apply_dynamic_eq(a,sr,1)
        for start,end in ((2.2,2.5),(3.2,3.45)):
            sl=slice(int(start*sr),int(end*sr))
            delta=20*np.log10(np.std(y[0,sl])/np.std(a[0,sl]))
            self.assertLess(delta,-.2);self.assertGreater(delta,-3.05)
        t=np.arange(sr*5)/sr;steady=(.1*np.sin(2*np.pi*280*t)).astype(np.float32)
        out=apply_dynamic_eq(steady,sr,1)
        np.testing.assert_allclose(out[-sr:],steady[-sr:],atol=1e-6)

    def test_fixed_residual_transfer_is_cut_only_with_bounded_center(self):
        for sr in (8000,16000,44100,48000,96000,192000):
            for f,q in ((280,1.25),(3200,1.4)):
                if f>=sr*.42:continue
                b0,b1,b2,a1,a2=coefficients(sr,f,q)
                _,h=signal.freqz([b0,b1,b2],[1,a1,a2],worN=8192)
                result=1-(1-10**(-1.5/20))*h
                db=20*np.log10(abs(result))
                self.assertLess(float(max(db)),1e-8)
                self.assertGreater(float(min(db)),-1.501)

    def test_source_rates_finite_and_missing_old_parameter_bypasses(self):
        self.assertEqual(MasteringParams().dynamic_eq_amount,0)
        self.assertEqual(get_mastering_params(analysis(),intensity=0).dynamic_eq_amount,0)
        normal=get_mastering_params(analysis(),intensity=65)
        dense=get_mastering_params(analysis(crest_factor=6),intensity=65)
        self.assertGreater(normal.dynamic_eq_amount,dense.dynamic_eq_amount)
        for sr in (4000,8000,44100,48000,96000):
            x=fixture(sr);y=apply_dynamic_eq(x,sr,.65)
            self.assertTrue(np.isfinite(y).all());self.assertEqual(y.shape,x.shape)

    def test_actual_worklet_matches_server_and_preserves_state_between_blocks(self):
        for sr in (8000,48000):
            x=fixture(sr)
            request=json.dumps({'rate':sr,'mode':'dynamic','params':{'dynamic_eq_amount':.65},'channels':x.tolist()})
            result=subprocess.run(['node',str(ROOT/'scripts/mastering-worklet-probe.cjs')],input=request,text=True,capture_output=True,check=True)
            actual=np.array(json.loads(result.stdout),np.float32)
            expected=apply_dynamic_eq(x,sr,.65)
            np.testing.assert_allclose(actual,expected,atol=4e-8)


if __name__=='__main__':unittest.main()
