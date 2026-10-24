"""Transient coverage, release behavior, phase integrity and true-peak safety."""
import sys
import unittest
from pathlib import Path
import numpy as np
from scipy.ndimage import maximum_filter1d
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from limiter_envelope import limiter_gain
from mastering import _limit_to_ceiling, _true_peak_envelope, apply_true_peak_limiter
from analyzer import compute_true_peak


def previous_limiter(audio,sr,ceiling):
    """Frozen pre-change envelope for a reproducible non-subjective comparison."""
    peak=_true_peak_envelope(audio,sr,4);look=max(1,int(sr*.005))
    ahead=maximum_filter1d(peak,size=look+1,origin=-(look//2))
    desired=np.minimum(1,ceiling/np.maximum(ahead,1e-8));ds=max(1,sr//1000);n=len(desired)//ds
    if not n:return audio*float(min(desired))
    blocks=desired[:n*ds].reshape(n,ds).min(axis=1);values=[];g=1.;c=np.exp(-1/(sr/ds*.05))
    for d in blocks:g=min(float(d),c*g+(1-c)*float(d));values.append(g)
    gain=np.interp(np.arange(len(desired)),np.arange(n)*ds+ds*.5,values)
    out=np.clip(audio*gain,-ceiling,ceiling).astype(np.float32)
    peak=float(np.max(_true_peak_envelope(out,sr,4)))
    if peak>ceiling:out*=ceiling/peak
    return out


class LimiterEnvelopeTests(unittest.TestCase):
    def test_every_sample_and_partial_tail_are_covered(self):
        for sr in (4000,8000,44100,48000,96000,192000):
            for n in (1,7,sr//1000+3,1071):
                required=np.ones(n,np.float32);required[-1]=.4
                gain=limiter_gain(required,sr)
                self.assertTrue(np.isfinite(gain).all())
                self.assertTrue((gain<=required+1e-7).all());self.assertTrue((gain>0).all())
                np.testing.assert_array_equal(limiter_gain(np.ones(n,np.float32),sr),np.ones(n,np.float32))

    def test_bounded_smooth_anticipation_no_extra_output_delay(self):
        sr=48000;r=np.ones(sr,np.float32);r[sr//2]=.4
        g=limiter_gain(r,sr);first=np.flatnonzero(g<.999999)[0]
        self.assertGreaterEqual(first,sr//2-round(sr*.005))
        self.assertLess(first,sr//2)
        self.assertLessEqual(float(np.max(-np.diff(g))),1/(sr*.005)+1e-7)
        self.assertLessEqual(g[sr//2],.400001)

    def test_sustained_reduction_recovers_more_slowly_than_isolated_event(self):
        sr=48000;single=np.ones(sr,np.float32);sustained=single.copy()
        single[sr//2]=.5;sustained[sr//4:sr//2+1]=.5
        a=limiter_gain(single,sr);b=limiter_gain(sustained,sr)
        self.assertGreater(a[sr//2+2400],b[sr//2+2400])

    def test_no_hard_clipped_flat_top_and_stereo_linked_all_rates(self):
        for sr in (8000,44100,48000,96000):
            t=np.arange(sr)/sr;x=(1.3*np.sin(2*np.pi*80*t)).astype(np.float32)
            x[-1]=1.7;audio=np.stack([x,-x*.6]);original=audio.copy()
            y=_limit_to_ceiling(audio,sr,-1)
            self.assertEqual(y.shape,audio.shape);self.assertTrue(np.isfinite(y).all())
            self.assertLessEqual(compute_true_peak(y,sr),-.995)
            np.testing.assert_allclose(y[1],-y[0]*.6,atol=1e-7)
            np.testing.assert_array_equal(audio,original)
            self.assertLess(np.count_nonzero(np.abs(y[0])==np.float32(10**(-1/20))),3)

    def test_bass_gain_modulation_is_lower_than_previous_control_rate_limiter(self):
        sr=48000;t=np.arange(sr*2)/sr
        x=(1.3*np.sin(2*np.pi*80*t)).astype(np.float32);audio=np.stack([x,x])
        old=previous_limiter(audio,sr,10**(-1/20));new=_limit_to_ceiling(audio,sr,-1)
        # Distortion of a steady diagnostic tone, not a claim about all music.
        def harmonics(y):
            spectrum=abs(np.fft.rfft(y[0,sr:]));return float(np.sqrt(sum(spectrum[80*k]**2 for k in range(2,12)))/spectrum[80])
        self.assertLess(harmonics(new),harmonics(old)*.8)

    def test_sparse_transient_guardrail_and_silence_remain_safe(self):
        sr=48000;t=np.arange(sr*2)/sr
        x=(.01*np.sin(2*np.pi*1000*t)).astype(np.float32);x[sr]=.9
        result=apply_true_peak_limiter(np.stack([x,x]),sr,-1,-8)
        self.assertLessEqual(compute_true_peak(result,sr),-.995)
        np.testing.assert_array_equal(_limit_to_ceiling(np.zeros((2,sr),np.float32),sr,-1),np.zeros((2,sr),np.float32))

    def test_tone_grid_does_not_hide_low_bass_or_high_frequency_regressions(self):
        sr=48000;t=np.arange(sr*2)/sr
        for frequency in (20,30,40,60,80,100,160,1000,8000):
            x=(1.3*np.sin(2*np.pi*frequency*t)).astype(np.float32);audio=np.stack([x,x])
            def harmonics(y):
                z=abs(np.fft.rfft(y[0,sr:]));return float(np.sqrt(sum(z[frequency*k]**2 for k in range(2,min(12,24000//frequency))))/z[frequency])
            old=harmonics(previous_limiter(audio,sr,10**(-1/20)))
            new=harmonics(_limit_to_ceiling(audio,sr,-1))
            self.assertLessEqual(new,old+2e-7)


if __name__=='__main__':unittest.main()
