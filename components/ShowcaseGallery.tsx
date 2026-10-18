import { ChevronLeft, ChevronRight, Headphones, Loader2, Pause, Play } from "lucide-react";
import type { CSSProperties, Ref } from "react";
import type { ShowcaseSide, ShowcaseTrack } from "@/lib/showcaseTracks";
import "./showcase-gallery.css";

const COVER_TITLES: Record<string,string> = { "lass-mich-nicht-allein":"Lass mich nicht allein", "back-to-my-acid":"Back to My Acid", "on-tour":"On Tour", "xplore-belgium":"Xplore Belgium" };

export function ShowcaseArtwork({ track }: { track: ShowcaseTrack }) {
  // Decorative, generated artwork — not an artist photograph or measured analyzer.
  const hue = [...track.id].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) % 360, 0);
  const cover = COVER_TITLES[track.id] === track.title ? `/images/showcase/${track.id}-v1.webp` : null;
  return <div className="gallery-artwork" style={{ "--cover-hue": hue } as CSSProperties} aria-hidden="true">
    {cover ? <img src={cover} width={768} height={768} alt="" loading="lazy" decoding="async"/> : <svg viewBox="0 0 400 400" fill="none"><defs><linearGradient id={`cover-${track.id}`} x1="0" y1="0" x2="400" y2="400" gradientUnits="userSpaceOnUse"><stop stopColor="currentColor"/><stop offset="1" stopColor="#ec8be8"/></linearGradient></defs>
      {Array.from({length:9},(_,i)=><ellipse key={i} cx="200" cy="200" rx={48+i*15} ry={130-i*8} transform={`rotate(${i*16} 200 200)`} stroke={`url(#cover-${track.id})`} strokeWidth={i===4?2:1} opacity={.18+i*.07}/>)}
      <circle cx="200" cy="200" r="31" stroke="currentColor" strokeWidth=".5"/><circle cx="200" cy="200" r="5" fill="currentColor"/>
    </svg>}<span className="gallery-art-label">BEATZUCKER / SOUND SERIES</span><span className="gallery-art-title">{track.title}</span><span className="gallery-art-genre">{track.genre}</span>
  </div>;
}

export default function ShowcaseGallery({ tracks, index, side, playing, loading, en, onSelect, onToggle, onSide, contoursRef }: {
  tracks: ShowcaseTrack[]; index: number; side: ShowcaseSide; playing: boolean; loading: boolean; en: boolean;
  onSelect: (index: number) => void; onToggle: () => void; onSide: (side: ShowcaseSide) => void;
  contoursRef?: Ref<HTMLDivElement>;
}) {
  const track=tracks[index]||tracks[0], count=tracks.length;
  const previous=(index+count-1)%count, next=(index+1)%count;
  return <div className={`showcase-gallery ${playing ? "is-playing" : ""}`} data-side={side}>
    <div className="gallery-ab" role="group" aria-label={en?"Choose original or master":"Original oder Master wählen"}>
      <button type="button" aria-pressed={side==="original"} onClick={()=>onSide("original")}><b>A</b>{en?"Original":"Original"}</button>
      <button type="button" aria-pressed={side==="master"} onClick={()=>onSide("master")}><b>B</b>{en?"Mastered":"Gemastert"}</button>
    </div>
    <div className="gallery-stage">
      <div ref={contoursRef} className="gallery-contours" aria-hidden="true">{Array.from({length:8},(_,i)=><i key={i} style={{"--ring":i} as CSSProperties}/>)}</div>
      {count>1&&<button type="button" className="gallery-arrow gallery-prev" onClick={()=>onSelect(previous)} aria-label={en?"Previous track":"Vorheriger Track"}><ChevronLeft/></button>}
      {count>1&&<button type="button" className="gallery-neighbour gallery-left" onClick={()=>onSelect(previous)} aria-label={`${en?"Choose":"Auswählen"}: ${tracks[previous].title}`}><ShowcaseArtwork track={tracks[previous]}/><span>{tracks[previous].title}</span></button>}
      <div className="gallery-feature" key={track.id}><ShowcaseArtwork track={track}/><button type="button" className="gallery-play" onClick={onToggle} aria-label={loading?(en?"Cancel playback start":"Wiedergabestart abbrechen"):playing?(en?"Pause comparison":"Vergleich pausieren"):(en?"Play comparison":"Vergleich abspielen")}>{loading?<Loader2 className="listening-spinner"/>:playing?<Pause/>:<Play/>}</button><span className="gallery-version">{side==="original"?(en?"ORIGINAL MIX":"ORIGINAL-MIX"):"BEATZUCKER MASTER"}</span></div>
      {count>2&&<button type="button" className="gallery-neighbour gallery-right" onClick={()=>onSelect(next)} aria-label={`${en?"Choose":"Auswählen"}: ${tracks[next].title}`}><ShowcaseArtwork track={tracks[next]}/><span>{tracks[next].title}</span></button>}
      {count>1&&<button type="button" className="gallery-arrow gallery-next" onClick={()=>onSelect(next)} aria-label={en?"Next track":"Nächster Track"}><ChevronRight/></button>}
    </div>
    <div className="gallery-caption"><span><Headphones size={14}/>{track.genre}</span><h3>{track.title}</h3><p>{en?"24-second excerpt · switch A/B at the same position":"24 Sekunden Hörprobe · A/B an derselben Stelle umschalten"}</p></div>
    <div className="gallery-track-picker" role="group" aria-label={en?"Choose a listening example":"Hörbeispiel auswählen"}>{tracks.map((song,i)=><button key={song.id} type="button" aria-pressed={index===i} onClick={()=>onSelect(i)}><span>{String(i+1).padStart(2,"0")}</span>{song.title}</button>)}</div>
  </div>;
}
