import sys
import unittest
from dataclasses import asdict
from pathlib import Path
import numpy as np
from scipy import signal
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from reference_matching import tonal_profile,resolve_reference,reference_curve,bound_curve,curve_sos,apply_reference_eq
from ai_params import get_mastering_params
from test_adaptive_params import analysis

class ReferenceMatchingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sr=48000
        cls.audio=np.random.default_rng(44).normal(0,.04,(2,cls.sr*6)).astype(np.float32)
        cls.profile=tonal_profile(cls.audio,cls.sr)

    def test_real_profiles_are_gain_and_stereo_polarity_invariant(self):
        a=self.profile;b=tonal_profile(self.audio*.1,self.sr)
        np.testing.assert_allclose(a["bands"],b["bands"],atol=2e-5)
        mono=self.audio[0]
        same=tonal_profile(np.stack([mono,mono]),self.sr)
        inverse=tonal_profile(np.stack([mono,-mono]),self.sr)
        self.assertEqual(same,inverse)
        self.assertIsNone(tonal_profile(np.zeros((2,self.sr)),self.sr))

    def test_quiet_edges_do_not_dominate_profile(self):
        extended=np.pad(self.audio,((0,0),(self.sr*4,self.sr*4)))
        p=tonal_profile(extended,self.sr)
        self.assertLess(p["active_fraction"],.6)
        np.testing.assert_allclose(p["bands"],self.profile["bands"],atol=.5)

    def test_weights_zero_and_level_invariance(self):
        a=analysis();b=analysis(rms_sub=-35,rms_low=-30,rms_mid=-24)
        a["tonal_profile"]=self.profile;b["tonal_profile"]=self.profile
        bundle={"references":[a,b],"weights":[100,0],"settings":{"amount":.65}}
        result=resolve_reference(bundle)
        self.assertAlmostEqual(result["rms_sub"],a["rms_sub"]-a["rms_mid"])
        shifted={**a,**{k:a[k]-15 for k in ["rms_sub","rms_low","rms_mid","rms_high","rms_air","integrated_lufs","true_peak"]}}
        result2=resolve_reference({**bundle,"references":[shifted,b]})
        self.assertEqual(result["tonal_profile"],result2["tonal_profile"])
        for k in ["rms_sub","rms_low","rms_mid","rms_high","rms_air"]:self.assertAlmostEqual(result[k],result2[k])
        with self.assertRaises(ValueError):resolve_reference({**bundle,"weights":[0,0]})
        with self.assertRaises(ValueError):resolve_reference({**bundle,"settings":{"amount":float('nan')}})

    def test_zero_amount_exactly_matches_no_reference_and_zero_intensity_bypasses(self):
        source=analysis();ref=analysis(spectral_centroid=5200)
        a=asdict(get_mastering_params(source));b=asdict(get_mastering_params(source,reference_analysis={"references":[ref],"weights":[100],"settings":{"amount":0}}))
        a.pop("notes");b.pop("notes");self.assertEqual(a,b)
        source["tonal_profile"]=self.profile
        ref["tonal_profile"]={**self.profile,"bands":[v+(i-12)*.4 for i,v in enumerate(self.profile["bands"])]}
        params=get_mastering_params(source,reference_analysis=ref,intensity=0)
        self.assertEqual(params.reference_eq,[])

    def test_bounded_actual_frequency_response_at_all_rates(self):
        curve=[{"frequency":f,"gain":1.2,"q":.8} for f in [80,125,200,315,500,800,1250,2000,3150,5000,8000,12000]]
        for sr in [8000,16000,44100,48000,96000,192000]:
            bounded=bound_curve(curve,sr);sos=curve_sos(bounded,sr)
            _,response=signal.sosfreqz(sos,worN=8192,fs=sr)
            self.assertLessEqual(np.max(np.abs(20*np.log10(np.maximum(np.abs(response),1e-12)))),3.005)
            processed=apply_reference_eq(self.audio[:,:12000],sr,bounded)
            self.assertEqual(processed.shape,(2,12000));self.assertTrue(np.isfinite(processed).all())

    def test_actual_tonal_move_improves_broad_reference_fit(self):
        reference=apply_reference_eq(self.audio,self.sr,[{"frequency":3150,"gain":3,"q":.5}])
        target=tonal_profile(reference,self.sr)
        resolved=resolve_reference({"references":[{**analysis(),"tonal_profile":target}],"weights":[100],"settings":{"amount":1,"smoothing":.2}})
        curve=bound_curve(reference_curve(self.profile,resolved),self.sr)
        self.assertTrue(curve)
        after=tonal_profile(apply_reference_eq(self.audio,self.sr,curve),self.sr)
        def error(profile):
            d=np.asarray(target["bands"])-np.asarray(profile["bands"]);d-=np.median(d)
            return float(np.sqrt(np.mean(d*d)))
        self.assertLess(error(after),error(self.profile))
        source=analysis();source["tonal_profile"]=self.profile
        params=get_mastering_params(source,reference_analysis={"references":[{**analysis(),"tonal_profile":target}],"weights":[100],"settings":{"amount":.65,"bass":0,"brightness":0,"smoothing":.65}})
        self.assertTrue(params.reference_eq)
        self.assertEqual(params.target_lufs,-14)
        self.assertEqual(params.true_peak_ceiling,-1)

    def test_missing_or_incompatible_profile_uses_legacy_without_inventing_bins(self):
        p=tonal_profile(self.audio[:,:16000],16000)
        self.assertTrue(any(v is None for v in p["bands"]))
        self.assertEqual(reference_curve(None,{"tonal_profile":self.profile}),[])
        self.assertEqual(get_mastering_params(analysis(),reference_analysis=analysis()).reference_eq,[])
