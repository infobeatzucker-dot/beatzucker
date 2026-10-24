"use client";
import {useId,useRef} from "react";
import type {Lang} from "@/lib/types/mastering";
import "./character-dial.css";

export default function ReferenceDial({label,value,min,max,initial,onChange,lang,primary=false,ends}:{label:string;value:number;min:number;max:number;initial:number;onChange:(value:number)=>void;lang:Lang;primary?:boolean;ends:[string,string]}) {
  const id=useId(),en=lang==="en",drag=useRef<{x:number;y:number;value:number;pointer:number}|null>(null);
  const fraction=(value-min)/(max-min),percent=Math.round(value*100),display=`${percent>0&&min<0?"+":""}${percent} %`;
  const set=(next:number)=>onChange(Number(Math.max(min,Math.min(max,min+Math.round((next-min)/.05)*.05)).toFixed(2)));
  return <div className={`reference-dial-module${primary?" reference-dial-primary":""}`}>
    <span className="reference-dial-label" id={id+"-label"}>{label}</span>
    <div className="reference-dial-body character-dial" role="slider" tabIndex={0} aria-labelledby={id+"-label"} aria-describedby={id+"-help"} aria-valuemin={min*100} aria-valuemax={max*100} aria-valuenow={percent} aria-valuetext={display} aria-orientation="vertical"
      onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,value,pointer:e.pointerId};}}
      onPointerMove={e=>{const d=drag.current;if(d?.pointer===e.pointerId)set(d.value+((d.y-e.clientY)+(e.clientX-d.x)*.6)/180*(max-min));}}
      onPointerUp={e=>{drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
      onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}} onDoubleClick={()=>set(initial)}
      onKeyDown={e=>{let next:number|undefined;const step=e.shiftKey?.1:.05;if(e.key==="ArrowUp"||e.key==="ArrowRight")next=value+step;if(e.key==="ArrowDown"||e.key==="ArrowLeft")next=value-step;if(e.key==="PageUp")next=value+.1;if(e.key==="PageDown")next=value-.1;if(e.key==="Home")next=min;if(e.key==="End")next=max;if(next!==undefined){e.preventDefault();set(next);}}}>
      <svg viewBox="0 0 180 180" className="character-arc" aria-hidden="true"><defs><linearGradient id={id+"-light"}><stop stopColor="#64edff"/><stop offset="1" stopColor="#c898ff"/></linearGradient></defs><path className="character-track" d="M34.846 145.154 A78 78 0 1 1 145.154 145.154"/><path className="character-progress" d="M34.846 145.154 A78 78 0 1 1 145.154 145.154" stroke={`url(#${id}-light)`} strokeDasharray={`${367.57*fraction} 367.57`}/></svg>
      <div className="reference-dial-ticks" aria-hidden="true"/>
      <div className="character-knurl"><div className="character-face"/><div className="character-pointer" style={{transform:`rotate(${-135+270*fraction}deg)`}}><i/></div></div>
      <span className="character-center-mark" aria-hidden="true">{primary?"R":"✦"}</span>
    </div>
    <div className="reference-dial-ends"><span>{ends[0]}</span><span>{ends[1]}</span></div>
    <output className="reference-dial-value" aria-hidden="true">{display}</output>
    <button type="button" className="reference-dial-reset" aria-label={`${label}: ${en?"reset":"zurücksetzen"}`} onClick={()=>set(initial)}>{en?"Reset":"Zurücksetzen"}</button>
    <span className="reference-visually-hidden" id={id+"-help"}>{en?"Drag up or sideways. Arrow keys change by 5 percent; double-click to reset.":"Nach oben oder seitlich ziehen. Pfeiltasten ändern um 5 Prozentpunkte; Doppelklick setzt zurück."}</span>
  </div>;
}
