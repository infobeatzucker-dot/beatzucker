import Link from "next/link";
import { Activity, ArrowRight, Disc3, FileOutput, Gauge, GitCompareArrows, Mic2, Music2, Radio, Scissors, Sparkles, Waves } from "lucide-react";
import type { Lang } from "@/lib/types/mastering";
import ToolLanguageNav from "./ToolLanguageNav";

export default function ToolsHub({ lang }: { lang: Lang }) {
  const en = lang === "en";
  return <>
    <section className="tools-hero">
      <ToolLanguageNav lang={lang}/>
      <span className="tools-kicker"><Sparkles size={14} /> BEATZUCKER AUDIO LAB</span>
      <h1>{en ? <>Useful tools for <em>better releases.</em></> : <>Nützliche Tools für <em>bessere Releases.</em></>}</h1>
      <p>{en ? "Analyze, preview and prepare your music directly in the browser — technically transparent and without permanent audio storage." : "Analysiere, simuliere und bereite deine Musik direkt im Browser vor – technisch transparent und ohne dauerhafte Audiospeicherung."}</p>
    </section>
    <section className="tools-grid">
      <Link className="tool-card" href={en ? "/en/tools/key-bpm" : "/tools/key-bpm"}>
        <div className="tool-card-icon"><Music2 size={28} /></div><span className="tool-status live">LIVE</span>
        <h2>{en ? "Key & BPM Detector" : "Tonart- & BPM-Detector"}</h2>
        <p>{en ? "Detect tempo, key and Camelot code, including useful half- and double-time alternatives." : "Erkenne Tempo, Tonart und Camelot-Code inklusive sinnvoller Half- und Double-Time-Alternativen."}</p>
        <div className="tool-tags"><span>BPM</span><span>KEY</span><span>CAMELOT</span></div>
        <strong>{en ? "Open tool" : "Tool öffnen"} <ArrowRight size={16} /></strong>
      </Link>
      <Link className="tool-card" href={en ? "/en/tools/kick-bass-conflict" : "/tools/kick-bass-conflict"}>
        <div className="tool-card-icon"><Waves size={28} /></div><span className="tool-status live">LIVE</span>
        <h2>{en ? "Kick & Bass Conflict Check" : "Kick-/Bass-Konflikt-Check"}</h2>
        <p>{en ? "Compare two stems locally and reveal spectral overlap between 35 and 350 Hz." : "Vergleiche zwei Stems lokal und erkenne spektrale Überlagerungen zwischen 35 und 350 Hz."}</p>
        <div className="tool-tags"><span>LOCAL FFT</span><span>LOW END</span><span>PRIVATE</span></div>
        <strong>{en ? "Open tool" : "Tool öffnen"} <ArrowRight size={16} /></strong>
      </Link>
      <Link className="tool-card" href={en ? "/en/tools/audio-converter" : "/tools/audio-converter"}>
        <div className="tool-card-icon"><FileOutput size={28} /></div><span className="tool-status live">LIVE</span>
        <h2>{en ? "Audio Format Converter" : "Audio-Format-Konverter"}</h2>
        <p>{en ? "Convert and resample locally to studio-ready WAV, with real TPDF dithering for integer formats." : "Konvertiere und resample lokal zu studiofähigem WAV – mit echtem TPDF-Dithering für Integer-Formate."}</p>
        <div className="tool-tags"><span>WAV</span><span>RESAMPLE</span><span>DITHER</span></div><strong>{en ? "Open tool" : "Tool öffnen"} <ArrowRight size={16}/></strong>
      </Link>
      <Link className="tool-card" href={en ? "/en/tools/album-consistency" : "/tools/album-consistency"}>
        <div className="tool-card-icon"><Disc3 size={28} /></div><span className="tool-status live">LIVE</span>
        <h2>{en ? "Album Consistency Check" : "Album-Konsistenz-Check"}</h2>
        <p>{en ? "Compare loudness, dynamics and tonal balance across an EP or album before release." : "Vergleiche Lautheit, Dynamik und Klangbalance einer EP oder eines Albums vor dem Release."}</p>
        <div className="tool-tags"><span>MULTI-TRACK</span><span>LUFS</span><span>TONE</span></div><strong>{en ? "Open tool" : "Tool öffnen"} <ArrowRight size={16}/></strong>
      </Link>
      <Link className="tool-card" href={en ? "/en/tools/streaming-preview" : "/tools/streaming-preview"}>
        <div className="tool-card-icon"><Radio size={28} /></div><span className="tool-status live">LIVE</span>
        <h2>{en ? "Streaming Preview" : "Streaming-Vorschau"}</h2>
        <p>{en ? "Hear platform loudness normalization and check true-peak and codec headroom before release." : "Höre die Plattform-Normalisierung und prüfe True Peak sowie Codec-Headroom vor dem Release."}</p>
        <div className="tool-tags"><span>LUFS</span><span>True Peak</span><span>Codec Risk</span></div>
        <strong>{en ? "Open tool" : "Tool öffnen"} <ArrowRight size={16} /></strong>
      </Link>
      <Link className="tool-card" href={en ? "/en/mix-check" : "/mix-check"}>
        <div className="tool-card-icon"><Activity size={28} /></div><span className="tool-status live">LIVE</span>
        <h2>Mix-Check</h2>
        <p>{en ? "Check headroom, dynamics, clipping, mono compatibility and technical file data." : "Prüfe Headroom, Dynamik, Clipping, Mono-Kompatibilität und technische Dateidaten."}</p>
        <div className="tool-tags"><span>Headroom</span><span>DR</span><span>Phase</span></div>
        <strong>{en ? "Open tool" : "Tool öffnen"} <ArrowRight size={16} /></strong>
      </Link>
      <Link className="tool-card" href={en?"/en/tools/reference-comparison":"/tools/reference-comparison"}><div className="tool-card-icon"><GitCompareArrows size={27}/></div><span className="tool-status live">LIVE</span><h2>{en?"Reference Comparison":"Referenz-Vergleich"}</h2><p>{en?"Compare loudness, dynamics, tone and stereo image with a reference track.":"Vergleiche Lautheit, Dynamik, Klangfarbe und Stereobild mit einem Referenztrack."}</p><div className="tool-tags"><span>A/B</span><span>TONE</span><span>DYNAMICS</span></div><strong>{en?"Open tool":"Tool öffnen"}<ArrowRight size={16}/></strong></Link>
      <Link className="tool-card" href={en?"/en/tools/stereo-phase":"/tools/stereo-phase"}><div className="tool-card-icon"><Waves size={27}/></div><span className="tool-status live">LIVE</span><h2>{en?"Stereo & Phase Lab":"Stereo- & Phasenlabor"}</h2><p>{en?"Inspect phase correlation, mono loss, balance and stereo width locally.":"Prüfe Phasenkorrelation, Mono-Verlust, Balance und Stereobreite lokal."}</p><div className="tool-tags"><span>PHASE</span><span>MONO</span><span>LOCAL</span></div><strong>{en?"Open tool":"Tool öffnen"}<ArrowRight size={16}/></strong></Link>
      <Link className="tool-card" href={en?"/en/tools/silence-normalizer":"/tools/silence-normalizer"}><div className="tool-card-icon"><Scissors size={27}/></div><span className="tool-status live">LIVE</span><h2>{en?"Silence Trimmer & Normalizer":"Silence-Trimmer & Normalizer"}</h2><p>{en?"Detect quiet edges, choose cut points and render a level-matched 24-bit WAV.":"Erkenne stille Ränder, wähle Schnittpunkte und rendere eine pegelangepasste 24-Bit-WAV."}</p><div className="tool-tags"><span>TRIM</span><span>LUFS</span><span>WAV</span></div><strong>{en?"Open tool":"Tool öffnen"}<ArrowRight size={16}/></strong></Link>
      <Link className="tool-card" href={en?"/en/tools/vocal-chain":"/tools/vocal-chain"}><div className="tool-card-icon"><Mic2 size={27}/></div><span className="tool-status live">LIVE</span><h2>Vocal Chain</h2><p>{en?"Shape vocals in real time with de-essing, filtering, compression, presence and air.":"Forme Vocals in Echtzeit mit De-Essing, Filter, Kompression, Präsenz und Air."}</p><div className="tool-tags"><span>REAL-TIME</span><span>DE-ESS</span><span>EXPORT</span></div><strong>{en?"Open tool":"Tool öffnen"}<ArrowRight size={16}/></strong></Link>
    </section>
    <section className="tools-principles"><Gauge size={22} /><div><strong>{en ? "Measurements, not magic." : "Messwerte statt Magie."}</strong><span>{en ? "Every result explains what was measured and what is only an estimate." : "Jedes Ergebnis erklärt, was gemessen wurde und was lediglich eine Prognose ist."}</span></div></section>
  </>;
}
