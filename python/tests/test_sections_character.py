import copy
import json
import subprocess
import sys
import unittest
from dataclasses import asdict
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'python'))
from song_sections import detect_sections,valid_sections,section_strength
from ai_params import get_mastering_params
from mastering import apply_bus_compression
from test_adaptive_params import analysis


def source(sr=8000):
    rng=np.random.default_rng(22);n=sr*8
    x=np.r_[rng.normal(0,.008,n),rng.normal(0,.045,n),.15*np.tanh(rng.normal(0,1,n))].astype(np.float32)
    return np.stack([x,-x*.7])


class SectionsCharacterTests(unittest.TestCase):
    def test_measured_regions_cover_source_and_are_level_polarity_invariant(self):
        x=source();p=detect_sections(x,8000)
        self.assertTrue(valid_sections(p));self.assertEqual(p['segments'][0]['start'],0);self.assertEqual(p['segments'][-1]['end'],24)
        self.assertIn('quiet',[s['kind'] for s in p['segments']]);self.assertIn('dense',[s['kind'] for s in p['segments']])
        for v in (.25,2):
            other=detect_sections(x*v,8000)
            self.assertEqual([(s['start'],s['end'],s['kind']) for s in p['segments']],[(s['start'],s['end'],s['kind']) for s in other['segments']])
        self.assertIsNone(detect_sections(np.zeros((2,80000),np.float32),8000))

    def test_malformed_and_oversized_plans_never_drive_dsp(self):
        p=detect_sections(source(),8000)
        for change in ('gap','nan','kind','many'):
            bad=copy.deepcopy(p)
            if change=='gap':bad['segments'][0]['start']=1
            if change=='nan':bad['segments'][0]['level_db']=float('nan')
            if change=='kind':bad['segments'][0]['kind']='chorus'
            if change=='many':bad['segments']=bad['segments']*65
            self.assertFalse(valid_sections(bad));self.assertIsNone(section_strength(bad,40,8000))

    def test_smooth_strength_never_boosts_and_control_offset_matches_full(self):
        p=detect_sections(source(),8000);a=section_strength(p,24*8000,8000)
        self.assertGreaterEqual(float(a.min()),.55-1e-7);self.assertLessEqual(float(a.max()),1)
        self.assertLess(float(abs(np.diff(a)).max()),.0001)
        np.testing.assert_array_equal(a[7*8000:12*8000],section_strength(p,5*8000,8000,7))

    def test_section_bus_is_real_and_stereo_linked(self):
        sr=8000;t=np.arange(sr*24)/sr;x=(.3*np.sin(2*np.pi*900*t)).astype(np.float32);audio=np.stack([x,-x*.7])
        p=get_mastering_params(analysis(sections=detect_sections(source(),sr)),intensity=65)
        y=apply_bus_compression(audio,sr,p);plan=p.section_plan;p.section_plan=None;baseline=apply_bus_compression(audio,sr,p)
        np.testing.assert_allclose(y[1],-y[0]*.7,atol=1e-7)
        self.assertGreater(float(np.std(y[:,:sr*6])),float(np.std(baseline[:,:sr*6])))
        self.assertLessEqual(float(np.max(abs(y))),float(np.max(abs(audio)))+1e-7)
        request=json.dumps({'rate':sr,'mode':'bus','params':{**asdict(p),'section_plan':plan},'channels':audio.tolist()})
        run=subprocess.run(['node',str(ROOT/'scripts/mastering-worklet-probe.cjs')],input=request,text=True,capture_output=True,check=True)
        np.testing.assert_allclose(np.array(json.loads(run.stdout)),y,atol=1e-7)

    def test_character_neutral_compatibility_zero_and_manual_priority(self):
        neutral=get_mastering_params(analysis());explicit=get_mastering_params(analysis(),character=.5)
        self.assertEqual(asdict(neutral),asdict(explicit))
        gentle=get_mastering_params(analysis(),character=0);bold=get_mastering_params(analysis(),character=1)
        self.assertLess(gentle.saturation_amount,bold.saturation_amount);self.assertLess(gentle.bus_comp_ratio,bold.bus_comp_ratio)
        self.assertEqual(gentle.target_lufs,bold.target_lufs);self.assertEqual(gentle.true_peak_ceiling,bold.true_peak_ceiling)
        for c in (0,1):
            p=get_mastering_params(analysis(),character=c,intensity=0)
            self.assertEqual(p.saturation_amount,0);self.assertEqual(p.bus_comp_ratio,1)
            p=get_mastering_params(analysis(),character=c,overrides={'bus_comp_ratio':1.23,'saturation_amount':.1})
            self.assertEqual(p.bus_comp_ratio,1.23);self.assertEqual(p.saturation_amount,.1)
        for c in (-1,2,True,float('nan')):
            with self.assertRaises(ValueError):get_mastering_params(analysis(),character=c)

    def test_loop_preview_uses_source_offset_and_wrap_not_playback_age(self):
        sr=8000;t=np.arange(sr*12)/sr;x=(.3*np.sin(2*np.pi*900*t)).astype(np.float32);audio=np.stack([x,x])
        plan=detect_sections(source(),sr);params=get_mastering_params(analysis(),intensity=65)
        baseline=apply_bus_compression(audio,sr,params)
        strength=np.tile(section_strength(plan,sr*4,sr,6),3)
        expected=audio+(baseline-audio)*strength
        request=json.dumps({'rate':sr,'mode':'bus','params':{**asdict(params),'section_plan':plan},'timeline':{'start':6,'end':10,'contextStart':0},'channels':audio.tolist()})
        run=subprocess.run(['node',str(ROOT/'scripts/mastering-worklet-probe.cjs')],input=request,text=True,capture_output=True,check=True)
        np.testing.assert_allclose(np.array(json.loads(run.stdout)),expected,atol=1e-7)


if __name__=='__main__':unittest.main()
