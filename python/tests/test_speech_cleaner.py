import os
import sys
import tempfile
import subprocess
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
import soundfile as sf
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from speech_cleaner import clean_speech


class SpeechCleanerTests(unittest.TestCase):
    def test_actual_noise_reduction_format_duration_and_peak(self):
        rate=48000
        t=np.arange(rate*6)/rate
        rng=np.random.default_rng(42)
        voice=np.zeros_like(t)
        voice[rate:5*rate]=.16*np.sin(2*np.pi*190*t[rate:5*rate])+.05*np.sin(2*np.pi*380*t[rate:5*rate])
        noise=rng.normal(0,.006,t.shape)
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/"voice.wav"
            sf.write(source,voice+noise,rate,subtype="PCM_24")
            before=source.read_bytes()
            audio,report=clean_speech(str(source),"balanced",True,False)
            result=Path(directory)/"result.wav";result.write_bytes(audio)
            output,sr=sf.read(result)
            self.assertEqual(source.read_bytes(),before)
            self.assertEqual(sr,48000)
            self.assertEqual(sf.info(result).subtype,"PCM_24")
            self.assertAlmostEqual(len(output)/sr,6,places=3)
            self.assertLess(report["true_peak"],-.8)
            self.assertTrue(np.all(np.isfinite(output)))
            # Ignore startup/edge padding. Stationary noise should actually drop.
            self.assertLess(np.std(output[int(.5*rate):int(.9*rate)]),np.std(noise[int(.5*rate):int(.9*rate)])*.85)
            self.assertGreater(np.std(output[2*rate:3*rate]),.04)

    def test_stereo_level_and_gain_budget(self):
        rate=16000;t=np.arange(rate*4)/rate
        audio=np.column_stack([.008*np.sin(2*np.pi*180*t),.006*np.sin(2*np.pi*230*t)])
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/"stereo.wav";sf.write(source,audio,rate)
            data,report=clean_speech(str(source),"gentle",False,True)
            result=Path(directory)/"out.wav";result.write_bytes(data)
            self.assertEqual(sf.info(result).channels,2)
            self.assertEqual(report["target_lufs"],-16)
            self.assertLessEqual(report["gain_db"],12)
            self.assertLess(report["true_peak"],-.8)
            self.assertAlmostEqual(sf.info(result).duration,4,places=3)

    def test_reject_settings_duration_and_silence(self):
        with self.assertRaises(ValueError):clean_speech("unused","fake")
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/"silent.wav";sf.write(source,np.zeros(48000),48000)
            with self.assertRaises(ValueError):clean_speech(str(source))
            with patch("speech_cleaner.validate_audio"),patch("speech_cleaner.sf.info",return_value=type("Info",(),{"duration":301,"samplerate":48000})()):
                with self.assertRaises(ValueError):clean_speech(str(source))

    def test_mp3_flac_and_strong_setting(self):
        rate=44100;t=np.arange(rate*3)/rate
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/"input.wav";sf.write(source,.1*np.sin(2*np.pi*230*t),rate)
            for extension,codec in [("mp3","libmp3lame"),("flac","flac")]:
                encoded=Path(directory)/("input."+extension)
                subprocess.run([os.environ.get("FFMPEG_BINARY","ffmpeg"),"-v","error","-nostdin","-i",str(source),"-c:a",codec,str(encoded)],check=True,timeout=15)
                data,report=clean_speech(str(encoded),"strong",False,False)
                result=Path(directory)/("from-"+extension+".wav");result.write_bytes(data)
                self.assertEqual(sf.info(result).channels,1)
                self.assertAlmostEqual(sf.info(result).duration,3,delta=.08)
                self.assertLess(report["true_peak"],-.8)

if __name__=="__main__":unittest.main()
