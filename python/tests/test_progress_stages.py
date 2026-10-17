"""Real stage instrumentation, bypass reporting and unchanged audio output."""
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import numpy as np
import soundfile as sf
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import mastering
from ai_params import MasteringParams

class ProgressStagesTests(unittest.TestCase):
    def audio(self):
        t = np.arange(16000) / 16000
        return np.stack([.12*np.sin(2*np.pi*440*t), .1*np.sin(2*np.pi*660*t)]).astype(np.float32)

    def test_reporting_does_not_change_processed_samples(self):
        params = MasteringParams(final_air_gain=1.0)
        source = self.audio()
        plain = mastering.process_mastering_audio(source, 16000, params)
        events = []
        reported = mastering.process_mastering_audio(source, 16000, params, lambda *event: events.append(event))
        np.testing.assert_array_equal(plain, reported)
        self.assertEqual([step for step, _ in events], ['dc','gain','eq','deesser','compression','ms','saturation','final_eq','bus_compression','limiting'])
        self.assertEqual([p for _,p in events], sorted(p for _,p in events))

    def test_zero_intensity_and_neutral_final_eq_are_not_claimed_active(self):
        events=[]
        mastering.process_mastering_audio(self.audio(),16000,MasteringParams(processing_intensity=0),lambda *event:events.append(event))
        names=[step for step,_ in events]
        self.assertEqual(names[0], 'dc')
        self.assertEqual(names[-1], 'limiting')
        self.assertTrue(all(name.endswith('_skipped') for name in names[1:-1]))
        events=[]
        mastering.process_mastering_audio(self.audio(),16000,MasteringParams(saturation_amount=.005,final_air_gain=0),lambda *event:events.append(event))
        self.assertIn('saturation_skipped',[s for s,_ in events])
        self.assertIn('final_eq_skipped',[s for s,_ in events])

    def test_full_orchestration_reports_format_specific_dither_and_verification(self):
        with tempfile.TemporaryDirectory() as folder:
            source=str(Path(folder)/'fixture.wav');sf.write(source,self.audio().T,16000)
            for fmt in ('wav16','mp3320'):
                events=[]
                def export(audio,sr,out,identifier,format_key,ceiling,progress):
                    progress('codec_verify',91)
                    return {fmt:'fixture'},audio,sr,0.0,0
                with patch.object(mastering,'export_peak_safe',side_effect=export), patch.object(mastering,'_quick_post_analysis',return_value={}):
                    mastering.master_audio(source,MasteringParams(final_air_gain=1),folder,lambda *event:events.append(event),fmt,{},'fixture')
                names=[s for s,_ in events]
                self.assertIn('dithering' if fmt=='wav16' else 'dithering_skipped',names)
                self.assertLess(names.index('codec_verify'),names.index('post_analysis'))
                self.assertEqual(names[-1],'complete')
                self.assertEqual([p for _,p in events],sorted(p for _,p in events))

if __name__ == '__main__': unittest.main()
