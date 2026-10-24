"""Local user-provided song excerpts only; no production files are modified."""
import argparse
import json
import time
from dataclasses import asdict
from pathlib import Path
import numpy as np
import soundfile as sf
from analyzer import analyze_audio, analysis_to_dict
from ai_params import get_mastering_params
from mastering import master_audio
from dynamic_eq import apply_dynamic_eq


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--source',action='append',required=True);parser.add_argument('--label',choices=['initial','after-limiter'],default='initial');args=parser.parse_args()
    root=Path(__file__).resolve().parents[1]/'validation-output'/'dynamic-eq-1.5'
    if args.label!='initial':root=root/args.label
    root.mkdir(parents=True,exist_ok=True)
    reports=[]
    for index,filename in enumerate(args.source):
        info=sf.info(filename);start=min(60,max(0,info.duration-20))
        audio,sr=sf.read(filename,start=round(start*info.samplerate),frames=info.samplerate*20,always_2d=True,dtype='float32')
        source=root/f'source-{index}.wav';sf.write(source,audio,sr,subtype='PCM_24')
        analysis=analysis_to_dict(analyze_audio(str(source)));params=get_mastering_params(analysis)
        # Warm the JIT before measuring this small excerpt's processing cost.
        apply_dynamic_eq(audio.T[:,:sr],sr,params.dynamic_eq_amount)
        tick=time.perf_counter();processed=apply_dynamic_eq(audio.T,sr,params.dynamic_eq_amount);elapsed=time.perf_counter()-tick
        assert np.isfinite(processed).all()
        renders=[]
        for enabled in (False,True):
            p=get_mastering_params(analysis)
            if not enabled:p.dynamic_eq_amount=0
            result=master_audio(str(source),p,str(root),selected_format='wav24',pre_analysis=analysis,master_id=f'dynamic-{index}-{int(enabled)}')
            assert result.post_analysis['true_peak']<=-.9
            renders.append({'enabled':enabled,'params':asdict(p),'post':result.post_analysis,'wav':result.paths['wav24']})
        reports.append({'source':Path(filename).name,'seconds':len(audio)/sr,'dynamic_seconds_warm':elapsed,'max_sample_difference':float(np.max(abs(processed-audio.T))),'renders':renders})
    (root/'report.json').write_text(json.dumps(reports,indent=2,allow_nan=False),encoding='utf8')
    print(json.dumps({'ok':True,'songs':[{'source':r['source'],'seconds':r['seconds'],'dynamic_seconds_warm':r['dynamic_seconds_warm'],'max_sample_difference':r['max_sample_difference'],'peaks':[v['post']['true_peak'] for v in r['renders']]} for r in reports]}))


if __name__=='__main__':main()
