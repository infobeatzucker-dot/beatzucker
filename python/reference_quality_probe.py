"""Optional local-only quality probe using explicitly supplied source/reference files.

Creates cropped test copies and comparison WAVs only in ignored validation-output.
No uploads, mail, database, or modifications to the input tracks.
"""
import argparse
import json
from dataclasses import asdict
from pathlib import Path
import numpy as np
import soundfile as sf
from analyzer import analyze_audio,analysis_to_dict
from ai_params import get_mastering_params
from mastering import master_audio

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--source',required=True);parser.add_argument('--reference',action='append',required=True);parser.add_argument('--start',type=float,default=60);args=parser.parse_args()
    root=Path(__file__).resolve().parents[1]/'validation-output'/'reference-mastering-1.5'
    root.mkdir(parents=True,exist_ok=True)
    def crop(filename,index):
        info=sf.info(filename);start=min(max(0,args.start),max(0,info.duration-20));audio,sr=sf.read(filename,start=round(start*info.samplerate),frames=info.samplerate*20,always_2d=True,dtype='float32')
        target=root/f'input-{index}.wav';sf.write(target,audio,sr,subtype='PCM_24');return target
    source=crop(args.source,0);a=analysis_to_dict(analyze_audio(str(source)))
    refs=[analysis_to_dict(analyze_audio(str(crop(p,i+1)))) for i,p in enumerate(args.reference[:3])]
    report={"references":len(refs),"source_profile":a.get('tonal_profile'),"renders":[]}
    for amount in [0,.65]:
        ref={"references":refs,"weights":[100]*len(refs),"settings":{"amount":amount,"bass":0,"brightness":0,"smoothing":.65}}
        params=get_mastering_params(a,reference_analysis=ref)
        result=master_audio(str(source),params,str(root),selected_format='wav24',pre_analysis=a,master_id='reference-'+str(amount).replace('.','-'))
        if not result.post_analysis['true_peak']<=-.9:raise AssertionError('Unsafe peak')
        report['renders'].append({'amount':amount,'params':asdict(params),'post':result.post_analysis,'wav':result.paths['wav24']})
    (root/'report.json').write_text(json.dumps(report,indent=2,allow_nan=False),encoding='utf8')
    print(json.dumps({'ok':True,'output':str(root),'curve_filters':len(report['renders'][1]['params']['reference_eq']),'peaks':[r['post']['true_peak'] for r in report['renders']]}))

if __name__=='__main__':main()
