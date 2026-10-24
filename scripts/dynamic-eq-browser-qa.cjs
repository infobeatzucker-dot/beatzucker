// Offline rendering in real Chrome; local pages only, no microphone or mail.
const assert=require('node:assert/strict');
if(process.env.BEATZUCKER_ISOLATED_QA!=='1')throw Error('Requires isolated local QA');
(async()=>{
  const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage();await page.goto('http://127.0.0.1:3013/tools');
    const result=await page.evaluate(async()=>{
      const sr=48000,n=sr*4,ctx=new OfflineAudioContext(2,n,sr);
      await ctx.audioWorklet.addModule('/audio/mastering-dynamics.js?v=1.5.0');
      const data=ctx.createBuffer(2,n,sr);
      for(let i=0;i<n;i++){
        const t=i/sr,x=.04*Math.sin(2*Math.PI*900*t)+(t>2&&t<2.55?.16*Math.sin(2*Math.PI*280*t):0);
        data.getChannelData(0)[i]=x;data.getChannelData(1)[i]=x*.6;
      }
      const src=ctx.createBufferSource();src.buffer=data;
      const node=new AudioWorkletNode(ctx,'beatzucker-mastering-dynamics',{outputChannelCount:[2],processorOptions:{mode:'dynamic',params:{dynamic_eq_amount:.65}}});
      src.connect(node).connect(ctx.destination);src.start();
      const start=performance.now(),rendered=await ctx.startRendering();let delta=0,stereo=0;
      for(let i=0;i<n;i++){
        const l=rendered.getChannelData(0)[i],r=rendered.getChannelData(1)[i];
        if(!Number.isFinite(l)||!Number.isFinite(r))throw Error('Nonfinite worklet output');
        delta=Math.max(delta,Math.abs(l-data.getChannelData(0)[i]));stereo=Math.max(stereo,Math.abs(r-l*.6));
      }
      return {delta,stereo,milliseconds:performance.now()-start};
    });
    assert.ok(result.delta>.001);assert.ok(result.stereo<1e-6);
    console.log('PASS real Chrome dynamic EQ module, audible-signal change, finite stereo-linked output; offline render timing (not real-time latency):',result);
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
