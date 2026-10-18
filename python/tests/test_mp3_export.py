"""Actual full-file MP3 export bitrate, including low-rate input; no mastering."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
import numpy as np
import soundfile as sf
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from codec_preview import render_codec

FFMPEG = shutil.which(os.environ.get('FFMPEG_BINARY','ffmpeg'))
FFPROBE = Path(FFMPEG).with_name('ffprobe.exe' if os.name=='nt' else 'ffprobe') if FFMPEG else None

@unittest.skipUnless(FFMPEG and FFPROBE.is_file(), 'FFmpeg and ffprobe required')
class Mp3ExportTests(unittest.TestCase):
    def test_actual_export_bitrate_for_low_native_and_high_rates(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory)/'source.wav'
            output = Path(directory)/'output.mp3'
            for rate in (8000,16000,22050,44100,96000):
                t=np.arange(rate)/rate
                sf.write(source,.1*np.sin(2*np.pi*220*t),rate,subtype='PCM_16')
                for bitrate in (128,320):
                    with self.subTest(rate=rate,bitrate=bitrate):
                        data,mime,_=render_codec(source,f'mp3{bitrate}',True)
                        self.assertEqual(mime,'audio/mpeg')
                        output.write_bytes(data)
                        result=subprocess.run([str(FFPROBE),'-v','error','-select_streams','a:0','-show_entries','stream=codec_name,bit_rate,sample_rate,channels','-of','json',str(output)],capture_output=True,check=True,text=True)
                        audio=json.loads(result.stdout)['streams'][0]
                        self.assertEqual(audio['codec_name'],'mp3')
                        self.assertEqual(int(audio['bit_rate']),bitrate*1000)
                        self.assertIn(int(audio['sample_rate']),(32000,44100,48000))
                        self.assertEqual(audio['channels'],1)
                        self.assertAlmostEqual(sf.info(output).duration,1,delta=.1)

    def test_existing_preview_does_not_opt_into_resampling(self):
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/'source.wav';output=Path(directory)/'output.mp3'
            rate=16000;sf.write(source,.1*np.sin(2*np.pi*220*np.arange(rate)/rate),rate)
            data,_,_=render_codec(source,'mp3320')
            output.write_bytes(data)
            self.assertEqual(sf.info(output).samplerate,16000)

    def test_export_rejects_non_mp3_codec(self):
        with self.assertRaises(ValueError):render_codec('never-read.wav','aac256',True)

if __name__=='__main__':unittest.main()
