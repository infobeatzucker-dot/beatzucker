"""Explicitly supplied local songs only; 24-second copies, no uploads or mail."""
import argparse,json
from dataclasses import asdict
from pathlib import Path
import numpy as np
import soundfile as sf
from analyzer import analyze_audio,analysis_to_dict
from ai_params import get_mastering_params
from mastering import master_audio
from song_sections import valid_sections


def main():
    cli=argparse.ArgumentParser();cli.add_argument('--source',action='append',required=True);args=cli.parse_args()
    root=Path(__file__).resolve().parents[1]/'validation-output'/'sections-character-1.5';root.mkdir(parents=True,exist_ok=True)
    reports=[]
    for i,filename in enumerate(args.source):
        full=analysis_to_dict(analyze_audio(filename));assert valid_sections(full.get('sections'))
        info=sf.info(filename);start=min(60,max(0,info.duration-24));data,sr=sf.read(filename,start=round(start*info.samplerate),frames=24*info.samplerate,dtype='float32',always_2d=True)
        source=root/f'source-{i}.wav';sf.write(source,data,sr,subtype='PCM_24');a=analysis_to_dict(analyze_audio(str(source)))
        renders=[];audio=[]
        for c in (0,.5,1):
            params=get_mastering_params(a,platform='club',preset='pop',intensity=65,character=c)
            result=master_audio(str(source),params,str(root),selected_format='mp3320',pre_analysis=a,master_id=f'character-{i}-{c}')
            assert result.post_analysis['true_peak']<=-.9
            rendered,_=sf.read(result.paths['mp3320'],dtype='float32',always_2d=True);audio.append(rendered)
            renders.append({'character':c,'params':asdict(params),'post':result.post_analysis,'path':result.paths['mp3320']})
        difference=float(np.max(abs(audio[0]-audio[-1])));assert difference>.0001
        reports.append({'song':Path(filename).name,'full_song_sections':full['sections'],'source_excerpt_start':start,'renders':renders,'endpoint_sample_difference':difference})
    (root/'quality-report.json').write_text(json.dumps(reports,indent=2,allow_nan=False),encoding='utf8')
    print(json.dumps({'ok':True,'songs':[{'song':s['song'],'sections':len(s['full_song_sections']['segments']),'endpoint_sample_difference':s['endpoint_sample_difference'],'peaks':[r['post']['true_peak'] for r in s['renders']]} for s in reports]}))


if __name__=='__main__':main()
