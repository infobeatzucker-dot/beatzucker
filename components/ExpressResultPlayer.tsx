"use client";

import { useEffect, useRef } from "react";
import { Play, Pause } from "lucide-react";
import { useAudioEngine } from "@/contexts/AudioEngineContext";
import type { Lang } from "@/lib/types/mastering";

/** A view onto the existing player, never a second audio source or graph. */
export default function ExpressResultPlayer({lang,active=true}:{lang:Lang;active?:boolean}) {
  const engine=useAudioEngine(),canvas=useRef<HTMLCanvasElement>(null),en=lang==='en';
  const analyser=engine?.analyserMono,playing=engine?.isPlaying??false;
  useEffect(()=>{
    const surface=canvas.current,ctx=surface?.getContext('2d');
    if(!surface||!ctx||!active)return;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    const frequency=new Uint8Array(analyser?.frequencyBinCount??128),wave=new Uint8Array(analyser?.fftSize??256);
    let raf=0,last=0;
    const draw=()=>{
      ctx.clearRect(0,0,640,400);
      let energy=0;
      if(analyser&&playing&&!document.hidden&&!reduced.matches){analyser.getByteFrequencyData(frequency);analyser.getByteTimeDomainData(wave);for(const sample of wave)energy+=((sample-128)/128)**2;energy=Math.min(1,Math.sqrt(energy/wave.length)*3);}
      const glow=ctx.createRadialGradient(320,200,10,320,200,190);glow.addColorStop(0,`rgba(102,172,255,${.08+energy*.18})`);glow.addColorStop(.5,'rgba(132,94,234,.06)');glow.addColorStop(1,'rgba(100,160,255,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,640,400);
      for(let ring=0;ring<4;ring++){
        ctx.beginPath();
        for(let point=0;point<=160;point++){
          const angle=point/160*Math.PI*2-Math.PI/2;
          const bin=Math.min(frequency.length-1,Math.round(2+Math.min(point,160-point)/80*Math.min(180,frequency.length-3)));
          const magnitude=playing&&!reduced.matches?frequency[bin]/255:0;
          const radius=72+ring*23+energy*(12+ring*4)+magnitude*(14+ring*7);
          const x=320+Math.cos(angle)*radius,y=200+Math.sin(angle)*radius*.78;
          if(point===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
        }
        ctx.closePath();ctx.strokeStyle=ring%2?'#b89aff':'#80dfff';ctx.globalAlpha=.8-ring*.13;ctx.lineWidth=ring===0?3:1.5;ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=playing?12:4;ctx.stroke();
      }
      ctx.shadowBlur=0;ctx.globalAlpha=1;
    };
    const tick=(time:number)=>{raf=0;if(document.hidden||!playing||reduced.matches)return;if(time-last>=1000/30){last=time;draw();}raf=requestAnimationFrame(tick);};
    const refresh=()=>{cancelAnimationFrame(raf);draw();if(playing&&!document.hidden&&!reduced.matches)raf=requestAnimationFrame(tick);};
    refresh();document.addEventListener('visibilitychange',refresh);reduced.addEventListener('change',refresh);
    return()=>{cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',refresh);reduced.removeEventListener('change',refresh);};
  },[analyser,playing,active]);
  if(!engine)return null;
  const time=(seconds:number)=>{const safe=Number.isFinite(seconds)?Math.max(0,Math.floor(seconds)):0;return `${Math.floor(safe/60)}:${String(safe%60).padStart(2,'0')}`;};
  return <section className="express-result-player" aria-label={en?'Original and master comparison':'Original und Master vergleichen'}>
    <div className="express-result-switch"><button type="button" aria-pressed={engine.mode==='A'} onClick={()=>engine.setMode('A')}>Original</button><button type="button" aria-pressed={engine.mode==='B'} disabled={engine.masterUnavailable} onClick={()=>engine.setMode('B')}>Master</button></div>
    <div className="express-result-stage"><canvas ref={canvas} width={640} height={400} aria-hidden="true"/><button type="button" className="express-result-play" onClick={engine.togglePlay} aria-label={playing?(en?'Pause comparison':'Vergleich pausieren'):(en?'Play comparison':'Vergleich abspielen')}>{playing?<Pause size={27}/>:<Play size={27}/>}</button><span>{engine.mode==='A'?'ORIGINAL':'BEATZUCKER MASTER'}</span></div>
    <label className="express-result-seek"><span>{en?'Playback position':'Wiedergabeposition'}</span><input type="range" min={0} max={Number.isFinite(engine.duration)?engine.duration:0} step={.1} value={Math.min(engine.currentTime,engine.duration||0)} onChange={event=>engine.seek(Number(event.target.value))}/></label>
    <div className="express-result-time"><span>{time(engine.currentTime)}</span><span>{time(engine.duration)}</span></div>
    <label className="express-result-match"><input type="checkbox" checked={engine.loudnessMatched} onChange={event=>engine.setLoudnessMatched(event.target.checked)}/>{en?'Match loudness':'Lautheit abgleichen'}</label>
    {engine.masterUnavailable&&<p role="alert">{en?'Master playback is unavailable. Try the download below.':'Master-Wiedergabe nicht verfügbar. Versuche den Download unten.'}</p>}
    <p>{en?'The rings react to the playing audio, not a simulated beat.':'Die Ringe reagieren auf das abgespielte Audio, nicht auf einen simulierten Takt.'}</p>
  </section>;
}
