"""Bounded public excerpts. No mastering, EQ, normalization or full-track decode."""
import os
import re
import subprocess
from pathlib import Path
import numpy as np
import pyloudnorm as pyln
from scipy import signal
from analyzer import compute_true_peak

RATE, SECONDS = 48000, 24

def _decode(file, start, duration):
    command = [os.environ.get('FFMPEG_BINARY','ffmpeg'),'-v','error','-nostdin','-ss',str(start),'-i',str(file),'-t',str(duration),'-map','0:a:0','-vn','-sn','-dn','-ar',str(RATE),'-ac','2','-f','f32le','pipe:1']
    result = subprocess.run(command,capture_output=True,check=True,timeout=65)
    audio = np.frombuffer(result.stdout,dtype='<f4').reshape(-1,2)
    if len(audio)>27*RATE or not np.isfinite(audio).all(): raise ValueError('Unsupported decoded audio')
    return audio

def _anchor(a,b,center):
    anchor=a[center:center+4*RATE:8].astype(np.float64);radius=RATE//4
    search=b[center-radius:center+4*RATE+radius:8].astype(np.float64)
    if len(anchor)!=RATE//2 or len(search)<len(anchor): raise ValueError('Ausschnitt zu kurz. / Excerpt too short.')
    correlation=signal.correlate(search,anchor,mode='valid',method='fft')
    energy=signal.fftconvolve(search**2,np.ones(len(anchor)),mode='valid')
    scores=correlation/np.sqrt(np.maximum(energy*np.sum(anchor**2),1e-20));index=int(np.argmax(scores))
    return index*8-radius,float(scores[index])


def _content_similarity(a, b, first, offset):
    """Corroborate content without requiring matching mastering phase.

    Log-energy envelopes are centered within each band: a similar genre or
    static tonal balance alone cannot establish a match. Analysis only; these
    filtered/spectral representations are NEVER written to the excerpts.
    """
    features, energies = [], []
    for audio, shift in ((a, 0), (b, offset)):
        begin = first + shift
        if begin < 0 or begin + SECONDS*RATE > len(audio):
            return 0.0
        frequencies, _, spectrum = signal.stft(audio[begin:begin+SECONDS*RATE], fs=RATE,
            nperseg=2048, noverlap=1024, boundary=None, padded=False)
        power = np.abs(spectrum)**2
        bands = np.stack([np.mean(power[(frequencies >= lo) & (frequencies < hi)], axis=0)
            for lo, hi in ((80,160),(160,320),(320,640),(640,1280),(1280,2560),(2560,5120),(5120,10000))])
        features.append(np.log(np.maximum(bands, 1e-15)))
        energies.append(np.mean(bands, axis=1))
    centered = [values-values.mean(axis=1, keepdims=True) for values in features]
    active = np.ones(7, dtype=bool)
    for values, energy in zip(features, energies):
        active &= (values.std(axis=1) > .08) & (energy > max(float(np.max(energy))*1e-5, 1e-15))
    if np.count_nonzero(active) < 4:
        return 0.0
    scores = np.sum(centered[0]*centered[1], axis=1) / np.sqrt(
        np.maximum(np.sum(centered[0]**2, axis=1)*np.sum(centered[1]**2, axis=1), 1e-20))
    valid = scores[active]
    return float(np.median(valid)) if np.count_nonzero(valid >= .75) >= 4 else 0.0


def _find_offset(mono, local_start):
    offset, confidence = _anchor(*mono, local_start+8*RATE)
    if confidence >= .65:
        return offset
    low = [signal.sosfiltfilt(signal.butter(4,1000,fs=RATE,output='sos'), audio) for audio in mono]
    anchors = [_anchor(*low, local_start+at*RATE) for at in (8,16)]
    if min(score for _,score in anchors) >= .65 and abs(anchors[0][0]-anchors[1][0]) <= RATE*.002:
        return int(round(float(np.median([lag for lag,_ in anchors]))))
    # A mastered mix may have strongly altered phase above the bass region.
    # Require FOUR consistent bass anchors AND independent multi-band temporal
    # content agreement; do not simply lower the existing confidence threshold.
    bass = [signal.sosfiltfilt(signal.butter(4,250,fs=RATE,output='sos'), audio) for audio in mono]
    anchors = [_anchor(*bass, local_start+at*RATE) for at in (4,8,12,16)]
    lags = [lag for lag,_ in anchors]
    offset = int(round(float(np.median(lags))))
    if (min(score for _,score in anchors) >= .65 and max(lags)-min(lags) <= RATE*.002
            and _content_similarity(*mono, local_start, offset) >= .8):
        return offset
    raise ValueError('Original und Master lassen sich nicht sicher zeitlich ausrichten. Bitte denselben Songabschnitt ohne andere Schnittfassung verwenden oder einen anderen Ausschnitt wählen. / Original and master cannot be aligned reliably. Use the same section without a different edit, or choose another excerpt.')

def prepare_showcase(original,master,start,asset_id):
    if not re.fullmatch(r'[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}',asset_id): raise ValueError('Invalid asset ID')
    if not np.isfinite(start) or not 0<=start<=600: raise ValueError('Start muss zwischen 0 und 600 Sekunden liegen. / Start must be between 0 and 600 seconds.')
    root=Path(os.environ.get('SHOWCASE_STORAGE_DIR',Path(__file__).resolve().parents[1]/'data'/'showcase')).resolve()
    root.mkdir(parents=True,exist_ok=True)
    read_start=max(0,start-.5);local_start=int(round((start-read_start)*RATE))
    arrays=[_decode(file,read_start,26) for file in (original,master)]
    if min(map(len,arrays))<local_start+SECONDS*RATE: raise ValueError('Beide Dateien müssen den kompletten 24-Sekunden-Ausschnitt enthalten. / Both files must contain the full 24-second excerpt.')
    mono=[audio.mean(axis=1) for audio in arrays]
    offset=_find_offset(mono,local_start)
    targets=[];result={'sourceStart':start,'duration':SECONDS}
    try:
        for side,audio,shift in zip(('original','master'),arrays,(0,offset)):
            first=local_start+shift
            if first<0 or first+SECONDS*RATE>len(audio): raise ValueError('Bitte einen anderen Startpunkt wählen. / Please choose another start point.')
            excerpt=audio[first:first+SECONDS*RATE].copy();fade=int(RATE*.012);ramp=np.linspace(0,1,fade,dtype=np.float32)
            excerpt[:fade]*=ramp[:,None];excerpt[-fade:]*=ramp[::-1,None]
            target=root/f'{asset_id}-{side}.mp3'
            # Claim ownership atomically. Failure cleanup must never delete another job's asset.
            with target.open('xb'):
                pass
            targets.append(target)
            subprocess.run([os.environ.get('FFMPEG_BINARY','ffmpeg'),'-v','error','-nostdin','-y','-f','f32le','-ar',str(RATE),'-ac','2','-i','pipe:0','-map_metadata','-1','-c:a','libmp3lame','-b:a','320k',str(target)],input=excerpt.astype('<f4').tobytes(),capture_output=True,check=True,timeout=65)
            decoded=_decode(target,0,25)
            lufs=float(pyln.Meter(RATE).integrated_loudness(decoded));peak=float(compute_true_peak(decoded.T,RATE))
            rms=float(np.sqrt(np.mean(decoded.astype(np.float64)**2)));crest=float(20*np.log10(max(float(np.max(np.abs(decoded))),1e-12)/max(rms,1e-12)))
            if not all(np.isfinite(v) for v in (lufs,peak,crest)): raise ValueError('Stille oder ungültige Messwerte. / Silence or invalid measurements.')
            result[side]={'url':f'/api/showcase/audio/{target.name}','bytes':target.stat().st_size,'duration':len(decoded)/RATE,'metrics':{'lufs':round(lufs,2),'truePeak':round(peak,2),'crest':round(crest,2)},'waveform':[round(float(np.max(np.abs(block))),5) for block in np.array_split(decoded,128)]}
        return result
    except Exception:
        for target in targets: target.unlink(missing_ok=True)
        raise
