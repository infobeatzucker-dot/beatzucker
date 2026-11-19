import type { CSSProperties } from "react";
import { ArrowRight, type LucideIcon } from "lucide-react";
import "./tool-card-art.css";

type ArtKind = "key" | "kick" | "convert" | "album" | "stream" | "mix" | "reference" | "phase"
  | "silence" | "vocal-chain" | "mp3" | "cutter" | "speech" | "vocal-remover" | "stem-separation";

function Signal({ profile }: { profile: "wave" | "spectrum" | "trim" }) {
  return <div className="tool-art-signal" data-profile={profile}>
    {Array.from({ length: 28 }, (_, index) => {
      const transient = Math.abs(Math.sin(index * 1.69) * Math.cos(index * .42));
      const envelope = profile === "spectrum" ? Math.exp(-index / 19)
        : profile === "trim" ? Math.min(1, index / 7, (27 - index) / 7) : 1;
      return <i key={index} style={{ "--signal-size": `${Math.round(7 + (30 + transient * 60) * envelope)}%` } as CSSProperties} />;
    })}
  </div>;
}

function Faders({ count }: { count: number }) {
  return <div className="tool-art-faders">{[35, 65, 44, 56].slice(0, count).map(level =>
    <div key={level} style={{ "--fader-level": `${level}%` } as CSSProperties}><i/><b/></div>
  )}</div>;
}

function Instrument({ kind }: { kind: ArtKind }) {
  switch (kind) {
    case "key":
      return <div className="tool-art-keyboard">{Array.from({ length: 10 }, (_, index) => <i key={index}/>)}</div>;
    case "convert":
    case "mp3":
      return <div className="tool-art-formats"><span>{kind === "mp3" ? "WAV" : "AUDIO"}</span><ArrowRight size={19}/><span>{kind === "mp3" ? "MP3" : "WAV"}</span></div>;
    case "phase":
      return <div className="tool-art-scope"><i/><i/><i/><i/></div>;
    case "cutter":
    case "silence":
      return <div className="tool-art-trim"><Signal profile="trim"/><i/><i/></div>;
    case "vocal-chain":
      return <div className="tool-art-knobs"><i/><i/><i/></div>;
    case "vocal-remover":
    case "stem-separation":
      return <Faders count={kind === "vocal-remover" ? 2 : 4}/>;
    case "reference":
    case "speech":
    case "kick":
      return <div className="tool-art-dual"><Signal profile={kind === "kick" ? "spectrum" : "wave"}/><Signal profile="wave"/></div>;
    case "stream":
    case "album":
      return <div className="tool-art-meter">{[81, 63, 70, 54].map(level =>
        <i key={level} style={{ "--meter-level": `${level}%` } as CSSProperties}/>
      )}</div>;
    case "mix":
      return <Signal profile="spectrum"/>;
  }
}

export default function ToolCardArt({ kind, icon: Icon }: { kind: ArtKind; icon: LucideIcon }) {
  return <div className="tool-art" data-kind={kind} aria-hidden="true">
    <span className="tool-art-icon"><Icon size={21} strokeWidth={1.65}/></span>
    <div className="tool-art-screen"><Instrument kind={kind}/></div>
  </div>;
}
