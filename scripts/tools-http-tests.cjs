/* Real HTTP checks against the explicitly isolated local Tools QA server. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
if(process.env.BEATZUCKER_ISOLATED_QA!=='1')throw Error('Requires BEATZUCKER_ISOLATED_QA=1');
const base='http://127.0.0.1:3013',folder=path.resolve(__dirname,'../validation-output/tools-audit-20261011');
async function upload(route,name,fields={}){
  const body=new FormData();body.append('file',new File([fs.readFileSync(path.join(folder,name))],name,{type:'audio/wav'}));
  for(const [key,value]of Object.entries(fields))body.append(key,String(value));
  return fetch(base+route,{method:'POST',body,headers:{Origin:base},signal:AbortSignal.timeout(175000)});
}
(async()=>{
  const slugs=['album-consistency','audio-converter','key-bpm','kick-bass-conflict','reference-comparison','silence-normalizer','stereo-phase','streaming-preview','vocal-chain'];
  for(const prefix of['','/en'])for(const slug of['tools',...slugs.map(s=>'tools/'+s),'mix-check']){
    const response=await fetch(base+prefix+'/'+slug);assert.equal(response.status,200);console.log('PASS '+prefix+'/'+slug);
  }
  let response=await upload('/api/mix-check','silence-a.wav',{purpose:'key-bpm',lang:'en'});assert.equal(response.status,200);let data=await response.json();assert.equal(data.analysis.key,'Unknown');console.log('PASS real silent key analysis returns Unknown');
  response=await upload('/api/codec-preview','test-tone.wav',{codec:'aac256'});assert.equal(response.status,200);assert.ok(Number.isFinite(Number(response.headers.get('X-Encoded-LUFS'))));assert.ok(response.headers.get('X-Encoded-LUFS'));assert.ok(response.headers.get('X-Encoded-True-Peak'));assert.ok((await response.arrayBuffer()).byteLength>100);console.log('PASS real AAC preview with measured loudness and peak');
  const body=new FormData();body.append('file',new File(['invalid'],'invalid.wav',{type:'audio/wav'}));body.append('lang','de');response=await fetch(base+'/api/mix-check',{method:'POST',body,headers:{Origin:base}});assert.equal(response.status,415);data=await response.json();assert.equal(data.code,'DECODE');assert.match(data.error,/Datei/);console.log('PASS German invalid-audio response');
  console.log('22 bilingual page checks and 3 real Tools API checks passed; isolated synthetic files only.');
})().catch(error=>{console.error(error);process.exitCode=1;});
