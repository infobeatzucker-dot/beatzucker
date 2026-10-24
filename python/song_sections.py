"""Measured energy/density regions, not guessed verse/chorus semantics."""
import numpy as np

STRENGTH = {'quiet': .55, 'steady': 1.0, 'dense': .8}


def detect_sections(audio, sr):
    x = np.asarray(audio)
    if x.ndim == 1: x = x[None, :]
    n = x.shape[-1]; duration = n / sr
    if duration < 4: return None
    # Whole samples, one second per feature frame; no phase-cancelling sum.
    hop = max(1, int(sr)); levels = []; crests = []
    for start in range(0, n, hop):
        frame = x[:, start:start+hop].astype(np.float64)
        rms = np.sqrt(np.mean(frame * frame)); peak = float(np.max(np.abs(frame)))
        levels.append(float(20*np.log10(max(rms,1e-8))))
        crests.append(float(np.clip(20*np.log10(max(peak,1e-8)/max(rms,1e-8)),0,60)))
    level = np.array(levels); crest = np.array(crests)
    active = level > max(-75., float(np.max(level))-35)
    if not active.any(): return None
    reference = float(np.median(level[active])); relative = level-reference
    # Relative to this song, not a fixed incoming file level. Two consecutive
    # frames are needed to change state; short hits cannot create a section.
    labels = ['quiet' if r < -4.5 else 'dense' if (r>2 and c<11) or c<7 else 'steady' for r,c in zip(relative,crest)]
    regions=[];begin=0;kind=labels[0];candidate=kind;count=0
    for i,label in enumerate(labels[1:],1):
        if label==kind: candidate=kind;count=0;continue
        count=count+1 if label==candidate else 1;candidate=label
        if count>=2 and i-1-begin>=4:
            regions.append((begin,i-1,kind));begin=i-1;kind=label;count=0
    regions.append((begin,len(level),kind))
    if len(regions)>1 and regions[-1][1]-regions[-1][0]<4:
        a,b,k=regions[-2];regions[-2]=(a,regions[-1][1],k);regions.pop()
    # Keep metadata bounded even for extremely alternating long material.
    while len(regions)>64:
        i=min(range(len(regions)-1),key=lambda i:regions[i+1][1]-regions[i][0])
        a,b,k=regions[i];c,d,j=regions[i+1];regions[i:i+2]=[(a,d,k if b-a>=d-c else j)]
    segments=[{'start':float(a),'end':float(min(duration,b)),'kind':k,
               'level_db':float(np.clip(np.median(relative[a:b]),-100,100)),
               'crest_db':float(np.median(crest[a:b]))} for a,b,k in regions]
    return {'version':1,'duration':duration,'segments':segments}


def valid_sections(plan):
    if not isinstance(plan,dict) or plan.get('version')!=1:return False
    duration=plan.get('duration');segments=plan.get('segments')
    if not isinstance(duration,(int,float)) or not np.isfinite(duration) or not 0<duration<=86400:return False
    if not isinstance(segments,list) or not 1<=len(segments)<=64:return False
    end=0.
    for s in segments:
        if not isinstance(s,dict) or s.get('kind') not in STRENGTH:return False
        if not all(isinstance(s.get(k),(int,float)) and np.isfinite(s[k]) for k in ('start','end','level_db','crest_db')):return False
        if abs(s['start']-end)>.001 or not s['start']<s['end']<=duration+.001 or not -100<=s['level_db']<=100 or not 0<=s['crest_db']<=60:return False
        end=s['end']
    return abs(end-duration)<.001


def section_strength(plan, frames, sr, offset=0):
    if not valid_sections(plan):return None
    segments=plan['segments'];points=[0.];values=[STRENGTH[segments[0]['kind']]]
    for a,b in zip(segments,segments[1:]):
        fade=min(.75,(a['end']-a['start'])/2,(b['end']-b['start'])/2)
        points.extend([b['start']-fade,b['start']+fade]);values.extend([STRENGTH[a['kind']],STRENGTH[b['kind']]])
    points.append(plan['duration']);values.append(STRENGTH[segments[-1]['kind']])
    output=np.empty(frames,np.float32)
    for first in range(0,frames,65536):
        end=min(frames,first+65536)
        output[first:end]=np.interp(np.arange(first,end)/sr+offset,points,values)
    return output
