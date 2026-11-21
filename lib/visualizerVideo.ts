type Visual = { title: string; cover?: ImageBitmap; peaks: Float32Array; altPeaks?: Float32Array; en: boolean };

export function drawVisualizer(canvas: HTMLCanvasElement, visual: Visual, progress = 0) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const {width:w,height:h}=canvas;
  const grad=ctx.createLinearGradient(0,0,w,h);
  grad.addColorStop(0,"#30134a");grad.addColorStop(.45,"#101b34");grad.addColorStop(1,"#08152a");
  ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  const pad=w*.09, side=w-2*pad, top=h*.16;
  ctx.save();ctx.beginPath();ctx.roundRect(pad,top,side,side,w*.055);ctx.clip();
  if(visual.cover) {
    const {width,height}=visual.cover, square=Math.min(width,height);
    ctx.drawImage(visual.cover,(width-square)/2,(height-square)/2,square,square,pad,top,side,side);
  } else {
    const glow=ctx.createRadialGradient(w*.57,top+side*.53,side*.04,w*.54,top+side*.47,side*.73);
    glow.addColorStop(0,"#673bf3");glow.addColorStop(.5,"#19427c");glow.addColorStop(1,"#10122f");
    ctx.fillStyle=glow;ctx.fillRect(pad,top,side,side);
    ctx.strokeStyle="#9edfff55";ctx.lineWidth=w*.004;
    for(let ring=1;ring<=7;ring++){
      ctx.beginPath();ctx.ellipse(w*.5,top+side*.5,side*ring*.055,side*ring*.062,progress*Math.PI,0,Math.PI*2);ctx.stroke();
    }
  }
  ctx.restore();
  const second=!!visual.altPeaks&&progress>=.5;
  const peaks=second?visual.altPeaks!:visual.peaks;
  const waveY=h*.705;
  ctx.lineWidth=Math.max(1,w/340);ctx.lineCap="round";
  const position=progress*(peaks.length-1);
  for(let i=0;i<peaks.length;i++){
    const x=pad+i/(peaks.length-1)*side, amp=Math.max(1,w*.14*Math.min(1,Math.sqrt(peaks[i])));
    ctx.strokeStyle=i<=position?(second?"#f3abff":"#9af7ff"):"#8998d877";
    ctx.beginPath();ctx.moveTo(x,waveY-amp);ctx.lineTo(x,waveY+amp);ctx.stroke();
  }
  ctx.fillStyle="#e8efff";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.font="700 "+Math.round(w*.064)+"px system-ui, sans-serif";
  ctx.fillText(visual.title,w*.5,h*.61,side);
  if(visual.altPeaks){
    ctx.font="600 "+Math.round(w*.045)+"px system-ui, sans-serif";
    ctx.fillStyle=second?"#f3abff":"#9af7ff";
    ctx.fillText(second?(visual.en?"B · Master":"B · Master"):"A · Original",w*.5,h*.815,side);
  }
  ctx.fillStyle="#cad4ef35";ctx.fillRect(pad,h*.86,side,Math.max(2,w*.009));
  ctx.fillStyle=second?"#f3abff":"#9af7ff";ctx.fillRect(pad,h*.86,side*progress,Math.max(2,w*.009));
}

const formats=["video/mp4;codecs=avc1.42001f,mp4a.40.2","video/mp4","video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"];

export async function renderVisualizer(canvas: HTMLCanvasElement, original: AudioBuffer, master: AudioBuffer | undefined, start: number, length: number,
  visual: Visual, signal: AbortSignal, onProgress: (value:number)=>void) {
  if (!canvas.captureStream || typeof MediaRecorder==="undefined") throw Error("VIDEO_UNSUPPORTED");
  const ctx=new AudioContext();
  const video=canvas.captureStream(30);
  const destination=ctx.createMediaStreamDestination();
  const stream=new MediaStream([...video.getVideoTracks(),...destination.stream.getAudioTracks()]);
  let recorder:MediaRecorder|undefined, frame=0;
  const sourceNodes:AudioBufferSourceNode[]=[];
  try {
    drawVisualizer(canvas,visual);
    for(const mimeType of formats){
      if(!MediaRecorder.isTypeSupported(mimeType))continue;
      try {recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:4_000_000,audioBitsPerSecond:160_000});break;}
      catch { /* Try the next container supported by this browser. */ }
    }
    if(!recorder)throw Error("VIDEO_UNSUPPORTED");
    const active=recorder;
    await ctx.resume();
    signal.throwIfAborted();
    const chunks:Blob[]=[];
    const result=new Promise<Blob>((resolve,reject)=>{
      active.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
      active.onstop=()=>{if(signal.aborted)reject(signal.reason);else if(chunks.length)resolve(new Blob(chunks,{type:active.mimeType}));else reject(Error("VIDEO_UNSUPPORTED"));};
      active.onerror=()=>reject(Error("VIDEO_UNSUPPORTED"));
    });
    const abort=()=>{if(active.state!=="inactive")active.stop();};
    signal.addEventListener("abort",abort,{once:true});
    try {
      active.start(350);
      const zero=ctx.currentTime+.05;
      const segments=master?[[original,0,length/2],[master,length/2,length/2]] as const:[[original,0,length]] as const;
      segments.forEach(([buffer,offset,duration],i)=>{
        const node=ctx.createBufferSource(),gain=ctx.createGain();
        node.buffer=buffer;node.connect(gain).connect(destination);
        const from=zero+offset,to=from+duration;
        gain.gain.setValueAtTime(0,from);gain.gain.linearRampToValueAtTime(1,from+.006);
        gain.gain.setValueAtTime(1,to-.006);gain.gain.linearRampToValueAtTime(0,to);
        if(i===segments.length-1)node.onended=()=>{drawVisualizer(canvas,visual,1);if(active.state!=="inactive")active.stop();};
        node.start(from,start+offset,duration);sourceNodes.push(node);
      });
      const draw=()=>{
        const progress=Math.max(0,Math.min(1,(ctx.currentTime-zero)/length));
        drawVisualizer(canvas,visual,progress);onProgress(progress);
        if(progress<1&&!signal.aborted)frame=requestAnimationFrame(draw);
      };
      draw();
      return await result;
    } finally { signal.removeEventListener("abort",abort); }
  } finally {
    cancelAnimationFrame(frame);
    if(recorder&&recorder.state!=="inactive")recorder.stop();
    sourceNodes.forEach(node=>{node.onended=null;node.stop();node.disconnect();});
    stream.getTracks().forEach(track=>track.stop());
    await ctx.close();
  }
}
