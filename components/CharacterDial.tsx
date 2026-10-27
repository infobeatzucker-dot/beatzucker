"use client";
import {useId,useRef} from 'react';
import type {Lang,SongSections} from '@/lib/types/mastering';
import './character-dial.css';

export default function CharacterDial({value,onChange,lang,sections}:{value:number;onChange:(value:number)=>void;lang:Lang;sections?:SongSections}){
  const en=lang==='en',id=useId(),drag=useRef<{x:number;y:number;value:number;id:number}|null>(null);
  const percent=Math.round(value*100),label=percent<35?(en?'Transparent':'Transparent'):percent>65?(en?'Punch':'Druckvoll'):(en?'Balanced':'Ausgewogen');
  const set=(next:number)=>onChange(Math.round(Math.max(0,Math.min(1,next))*100)/100);
  const names={quiet:en?'Quieter':'Ruhiger',steady:en?'Steady':'Ausgeglichen',dense:en?'Denser':'Dichter'};
  const time=(seconds:number)=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
  return <section className="character-card" aria-labelledby={id+'-title'}>
    <div className="character-copy"><span className="character-eyebrow">SONIC CHARACTER</span><h3 id={id+'-title'}>{en?'Make it yours.':'Dein Sound. Dein Charakter.'}</h3>
      <p>{en?'From open and restrained to fuller and more assertive. Shapes compression and saturation—not your loudness target.':'Von offen und zurückhaltend bis voller und druckvoller. Steuert Kompression und Sättigung – nicht dein Lautheitsziel.'}</p>
      <div className="character-readout"><span>{label}</span><output>{percent}<small>/100</small></output></div>
      <p className="character-hint" id={id+'-help'}>{en?'Drag up/down or sideways · arrow keys · double-click to reset. Applies to your next master.':'Nach oben/unten oder seitlich ziehen · Pfeiltasten · Doppelklick zum Zurücksetzen. Gilt für den nächsten Master.'}</p>
      <button className="character-reset" type="button" onClick={()=>set(.5)}>{en?'Reset to balanced':'Auf ausgewogen zurücksetzen'}</button>
    </div>
    <div className="character-instrument"><div className="character-dial" role="slider" tabIndex={0} aria-label={en?'Mastering character':'Mastering-Klangcharakter'} aria-describedby={id+'-help'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={`${label}, ${percent} ${en?'percent':'Prozent'}`} aria-orientation="vertical"
      onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,value,id:e.pointerId};}}
      onPointerMove={e=>{const d=drag.current;if(d&&d.id===e.pointerId)set(d.value+(d.y-e.clientY+(e.clientX-d.x)*.6)/180);}}
      onPointerUp={e=>{if(drag.current?.id===e.pointerId){drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}}
      onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}} onDoubleClick={()=>set(.5)}
      onKeyDown={e=>{const step=e.shiftKey?.05:.01;let next:number|undefined;if(e.key==='ArrowUp'||e.key==='ArrowRight')next=value+step;if(e.key==='ArrowDown'||e.key==='ArrowLeft')next=value-step;if(e.key==='PageUp')next=value+.1;if(e.key==='PageDown')next=value-.1;if(e.key==='Home')next=0;if(e.key==='End')next=1;if(next!==undefined){e.preventDefault();set(next);}}}>
      <svg viewBox="0 0 180 180" className="character-arc" aria-hidden="true"><defs><linearGradient id={id+'-gradient'} x1="0" x2="1"><stop stopColor="rgb(var(--bz-paint-6ce6fa))"/><stop offset="1" stopColor="rgb(var(--bz-paint-c49aff))"/></linearGradient></defs><path className="character-track" d="M34.846 145.154 A78 78 0 1 1 145.154 145.154"/><path className="character-progress" d="M34.846 145.154 A78 78 0 1 1 145.154 145.154" stroke={`url(#${id}-gradient)`} strokeDasharray={`${367.57*value} 367.57`}/></svg>
      <div className="character-knurl"><div className="character-face"/><div className="character-pointer" style={{transform:`rotate(${-135+270*value}deg)`}}><i/></div></div>
      <span className="character-center-mark" aria-hidden="true">✦</span>
    </div><div className="character-ends"><span>{en?'OPEN':'OFFEN'}</span><span>PUNCH</span></div></div>
    {sections&&<div className="song-sections"><div className="song-sections-heading"><strong>{en?'Your song’s energy map':'Die Energiekarte deines Songs'}</strong><span>{sections.segments.length} {en?(sections.segments.length===1?'region':'regions'):(sections.segments.length===1?'Abschnitt':'Abschnitte')}</span></div><div className="song-sections-tape" role="img" aria-label={sections.segments.map(s=>`${time(s.start)}–${time(s.end)} ${names[s.kind]}`).join(', ')}>{sections.segments.map((s,i)=><span key={i} className={'song-region '+s.kind} style={{flexGrow:s.end-s.start}} title={`${time(s.start)}–${time(s.end)} · ${names[s.kind]}`}/>)}</div><div className="song-sections-legend">{(['quiet','steady','dense'] as const).map(k=><span key={k}><i className={k}/>{names[k]}</span>)}<time>{time(sections.duration)}</time></div><p>{en?'Measured energy and density—not guessed verses or choruses. Gentle transitions reduce bus compression in quieter and denser regions; section levels are not equalized.':'Gemessene Energie und Dichte – keine geratenen Strophen oder Refrains. Weiche Übergänge nehmen Bus-Kompression in ruhigeren und dichteren Bereichen zurück; Abschnittspegel werden nicht angeglichen.'}</p></div>}
  </section>;
}
