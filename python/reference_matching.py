"""Bounded active-frame profiles and conservative, level-independent reference EQ."""
import numpy as np
from scipy import signal

CENTRES = np.geomspace(40, 16000, 24)
EQ_CENTRES = np.array([80,125,200,315,500,800,1250,2000,3150,5000,8000,12000],dtype=float)


def tonal_profile(audio, sr):
    """At most 512 actual FFT frames, stereo power (not phase-cancelling mono).

    Quiet frames are excluded relative to the loud frames. The median normalized
    band energy describes active material, not a semantic chorus detector.
    """
    x=np.asarray(audio)
    if x.ndim==1:x=x[None,:]
    n=x.shape[-1]
    if not n or sr<4000:return None
    length=min(8192,n)
    starts=np.unique(np.linspace(0,max(0,n-length),min(512,max(1,n//4096)),dtype=int))
    window=np.hanning(length)
    frequencies=np.fft.rfftfreq(8192,1/sr)
    edges=np.r_[CENTRES[0]/np.sqrt(CENTRES[1]/CENTRES[0]),np.sqrt(CENTRES[:-1]*CENTRES[1:]),CENTRES[-1]*np.sqrt(CENTRES[-1]/CENTRES[-2])]
    masks=[(frequencies>=edges[i])&(frequencies<edges[i+1]) for i in range(24)]
    available=np.array([m.any() and edges[i+1]<sr*.49 for i,m in enumerate(masks)])
    energy=[];rms=[]
    for start in starts:
        frame=x[:,start:start+length].astype(np.float64)
        spectrum=np.mean(np.abs(np.fft.rfft(frame*window,n=8192,axis=-1))**2,axis=0)
        energy.append([spectrum[m].sum() if ok else 0 for m,ok in zip(masks,available)])
        rms.append(float(np.mean(frame**2)))
    energy=np.asarray(energy);rms=np.asarray(rms)
    active=rms>max(float(np.percentile(rms,95))*1e-3,float(np.max(rms))*1e-4,1e-9)
    if not active.any():return None
    energy=energy[active]
    normalized=energy/np.maximum(energy.sum(axis=1,keepdims=True),1e-30)
    median=np.median(normalized,axis=0)
    valid=available&(median>1e-7)
    if valid.sum()<6:return None
    levels=10*np.log10(np.maximum(median,1e-10))
    return {"version":1,"bands":[round(float(v),5) if ok else None for v,ok in zip(levels,valid)],"active_fraction":round(float(active.mean()),5)}


def valid_profile(value):
    if not isinstance(value,dict) or value.get("version")!=1:return False
    bands=value.get("bands")
    return isinstance(bands,list) and len(bands)==24 and sum(v is not None for v in bands)>=6 and all(v is None or (isinstance(v,(int,float)) and not isinstance(v,bool) and np.isfinite(v) and -100<=v<=40) for v in bands)


def resolve_reference(value):
    """Old single-reference JSON is supported; bundles contain up to three refs."""
    if not value:return None
    if "references" not in value:return value
    refs=value["references"];weights=np.asarray(value.get("weights",[]),dtype=float)
    if not 1<=len(refs)<=3 or len(weights)!=len(refs) or not np.all(np.isfinite(weights)) or np.any(weights<0) or not weights.sum()>0:raise ValueError("Invalid reference bundle")
    weights=weights/weights.sum()
    enabled=[(r,float(w)) for r,w in zip(refs,weights) if w>0]
    result={}
    for key in ["integrated_lufs","true_peak","spectral_centroid","spectral_rolloff","spectral_flatness","rms_sub","rms_low","rms_mid","rms_high","rms_air","stereo_width","mono_compatibility","crest_factor","lra"]:
        pairs=[(r[key],w) for r,w in enabled if isinstance(r.get(key),(int,float)) and np.isfinite(r[key])]
        if pairs:result[key]=sum(v*w for v,w in pairs)/sum(w for _,w in pairs)
    # Relative broad-band balance: absolute file gain must not weight a reference.
    for band in ["rms_sub","rms_low","rms_mid","rms_high","rms_air"]:
        pairs=[(r[band]-r["rms_mid"],w) for r,w in enabled if band in r and "rms_mid" in r]
        if pairs:result[band]=sum(v*w for v,w in pairs)/sum(w for _,w in pairs)
    if all(valid_profile(r.get("tonal_profile")) for r,w in enabled):
        bands=[]
        for i in range(24):
            pairs=[(r["tonal_profile"]["bands"][i],w) for r,w in enabled]
            # No extrapolation from an incomplete subset of the references.
            bands.append(sum(v*w for v,w in pairs) if all(v is not None for v,w in pairs) else None)
        result["tonal_profile"]={"version":1,"bands":bands,"active_fraction":min(r["tonal_profile"].get("active_fraction",1) for r,w in enabled)}
    settings=value.get("settings",{})
    result["_settings"]={key:float(settings.get(key,default)) for key,default in [("amount",.65),("bass",0),("brightness",0),("smoothing",.65)]}
    for key,v in result["_settings"].items():
        if not np.isfinite(v) or not (-1 if key in {"bass","brightness"} else 0)<=v<=1:raise ValueError("Invalid reference controls")
    result["_count"]=len(enabled)
    return result


def profiles_compatible(source,reference):
    target=reference.get("tonal_profile")
    return valid_profile(source) and valid_profile(target) and sum(a is not None and b is not None for a,b in zip(source["bands"],target["bands"]))>=6


def reference_curve(source,reference):
    if not valid_profile(source) or not valid_profile(reference.get("tonal_profile")):return []
    settings=reference.get("_settings",{"amount":1,"bass":0,"brightness":0,"smoothing":.65})
    pairs=[(f,a,b) for f,a,b in zip(CENTRES,source["bands"],reference["tonal_profile"]["bands"]) if a is not None and b is not None]
    if len(pairs)<6:return []
    freq,src,ref=np.array(pairs).T
    delta=ref-src
    delta-=np.median(delta) # tonal shape only, never overall loudness
    delta=np.clip(delta,-6,6)
    radius=1+int(round(settings["smoothing"]*3))
    smooth=np.array([np.mean(delta[max(0,i-radius):i+radius+1]) for i in range(len(delta))])
    result=[]
    for f in EQ_CENTRES:
        # Do not fill gaps bigger than an octave, or unsupported end bands.
        if not freq[0]<=f<=freq[-1] or np.min(np.abs(np.log2(freq/f)))>.55:continue
        gain=float(np.interp(np.log(f),np.log(freq),smooth))*.35
        gain+=settings["bass"]*1.2*max(0,1-abs(np.log2(f/100))/2.5)
        gain+=settings["brightness"]*1.2*max(0,1-abs(np.log2(f/8000))/2.5)
        gain=float(np.clip(gain*settings["amount"],-1.2,1.2))
        if abs(gain)>.015:result.append({"frequency":float(f),"gain":gain,"q":.8})
    return result


def curve_sos(curve,sr):
    """RBJ peaking filters, matching the browser's peaking biquads."""
    rows=[]
    for item in curve:
        f,g,q=item["frequency"],item["gain"],item["q"]
        if f>=sr*.42 or abs(g)<1e-8:continue
        a=10**(g/40);omega=2*np.pi*f/sr;alpha=np.sin(omega)/(2*q);c=np.cos(omega)
        b=np.array([1+alpha*a,-2*c,1-alpha*a]);den=np.array([1+alpha/a,-2*c,1-alpha/a])
        rows.append(np.r_[b/den[0],den/den[0]])
    return np.asarray(rows)


def bound_curve(curve,sr=48000,limit=3.0):
    if not curve:return []
    curve=[dict(item) for item in curve]
    for _ in range(4):
        sos=curve_sos(curve,sr)
        if not len(sos):return []
        _,response=signal.sosfreqz(sos,worN=np.geomspace(20,min(20000,sr*.49),2048),fs=sr)
        peak=float(np.max(np.abs(20*np.log10(np.maximum(np.abs(response),1e-12)))))
        if peak<=limit:return curve
        for item in curve:item["gain"]*=limit/peak*.99
    return [] # never deliver an unverified response


def apply_reference_eq(audio,sr,curve):
    if not curve:return audio
    sos=curve_sos(bound_curve(curve,sr),sr)
    return signal.sosfilt(sos,audio,axis=-1).astype(np.float32) if len(sos) else audio
