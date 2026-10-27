/* Exercise actual UploadZone callbacks without network, audio or real timers. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const slots=[];let cursor=0,request,analysisResolve,uploaded=null;const states=[],analyzed=[];
const react={useState(value){const i=cursor++;slots[i]??={value};return[slots[i].value,next=>slots[i].value=typeof next==='function'?next(slots[i].value):next];},useRef(value){return slots[cursor++]??={current:value};},useEffect(){},useCallback:fn=>fn,useImperativeHandle(ref,create){if(ref)ref.current=create();}};
const jsx=(type,props)=>({type,props}),Signal=()=>null;
class XHR{constructor(){this.upload={};request=this;}open(){}send(){}abort(){this.onabort?.();}}
const mod={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/UploadZone.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module:mod,exports:mod.exports,require:name=>name==='react'?react:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:name.includes('dspAdmissionRetry')?{withDspAdmissionRetry:fn=>fn()}:{default:Signal},XMLHttpRequest:XHR,FormData:class{append(){}},AbortController,DOMException,Node:class{},setInterval:()=>1,clearInterval(){},fetch:()=>new Promise(resolve=>analysisResolve=resolve)});
const controller={current:null};
const props={controllerRef:controller,onUploadComplete:file=>uploaded=file,onAnalysisComplete:data=>analyzed.push(data),setAppState:state=>states.push(state),isAuthenticated:true,uploadedFile:null,lang:'de'};
function render(){cursor=0;return mod.exports.default({...props,uploadedFile:uploaded});}
function all(node){return node&&typeof node==='object'?[node,...[node.props?.children].flat(Infinity).flatMap(all)]:[];}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const idle=render();assert.equal(idle.props.role,'button');assert.equal(idle.props.tabIndex,0);
 let clicks=0;const input=all(idle).find(n=>n.type==='input');input.props.ref.current={click:()=>clicks++};
 idle.props.onKeyDown({key:'Enter',target:1,currentTarget:1,preventDefault(){}});assert.equal(clicks,1);
 idle.props.onKeyDown({key:'Enter',target:2,currentTarget:1,preventDefault(){}});assert.equal(clicks,1,'nested input does not reopen picker');
 controller.current.selectFile();assert.equal(clicks,2,'assistant uses same file picker');
 controller.current.uploadFile({name:'fixture.wav',size:12000});
 let busy=render(),signal=all(busy).find(n=>n.type===Signal);assert.equal(signal.props.phase,'uploading');assert.equal(signal.props.progress,0);
 request.upload.onprogress({lengthComputable:true,loaded:580,total:1000});signal=all(render()).find(n=>n.type===Signal);assert.equal(signal.props.progress,58);
 assert.equal(uploaded,null);request.status=200;request.responseText=JSON.stringify({file_id:'fixture',filename:'fixture.wav',duration:6,size:12000,format:'wav',upload_token:'fixture'});request.onload();await tick();
 signal=all(render()).find(n=>n.type===Signal);assert.equal(signal.props.phase,'received');assert.equal(uploaded.file_id,'fixture');assert.equal(states.join(','),'uploaded,analyzing');
 analysisResolve({ok:true,json:async()=>({integrated_lufs:-16})});await tick();assert.equal(analyzed.length,1);
 console.log('PASS actual keyboard upload, nested-input guard, byte progress, receipt only after success, subsequent analysis');
 slots.length=0;uploaded=null;render().props.onDrop({preventDefault(){},dataTransfer:{files:[{name:'broken.wav',size:12000}]}});
 request.status=500;request.responseText=JSON.stringify({error:'Fixture upload rejected'});request.onload();await tick();
 const failed=render();assert.equal(all(failed).some(n=>n.type===Signal&&n.props.phase==='received'),false);assert.match(JSON.stringify(failed),/Fixture upload rejected/);assert.equal(uploaded,null);
 console.log('PASS failed upload returns to idle with error and cannot show a successful receipt');
 slots.length=0;uploaded=null;let signIn=0;props.isAuthenticated=false;props.onSignInClick=()=>signIn++;render();controller.current.selectFile();controller.current.uploadFile({name:'fixture.wav',size:1});assert.equal(signIn,2);assert.equal(uploaded,null);console.log('PASS assistant delegates upload/selection to existing owner and respects authentication');
})().catch(error=>{console.error(error);process.exitCode=1;});
