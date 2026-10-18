import Link from "next/link";
import { Activity, ArrowRight, Disc3, FileOutput, Gauge, GitCompareArrows, Mic2, Music2, Radio, Scissors, Sparkles, Waves } from "lucide-react";
import type { Lang } from "@/lib/types/mastering";
import ToolLanguageNav from "./ToolLanguageNav";
import { PracticeHub } from "./ToolPractice";

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
      <Link className="tool-card" href={en?"/en/tools/wav-to-mp3":"/tools/wav-to-mp3"}><div className="tool-card-icon"><FileOutput size={27}/></div><span className="tool-status live">LIVE</span><h2>{en?"WAV to MP3":"WAV zu MP3"}</h2><p>{en?"Convert your WAV to a complete MP3 at 128 or 320 kbit/s, audition and download.":"Deine WAV als vollständige MP3 mit 128 oder 320 kbit/s konvertieren, vorhören und herunterladen."}</p><div className="tool-tags"><span>MP3</span><span>320K</span><span>DOWNLOAD</span></div><strong>{en?"Open converter":"Konverter öffnen"}<ArrowRight size={16}/></strong></Link>
      <Link className="tool-card" href={en?"/en/tools/audio-cutter":"/tools/audio-cutter"}><div className="tool-card-icon"><Scissors size={27}/></div><span className="tool-status live">LIVE</span><h2>{en?"Audio Cutter":"Audio-Cutter"}</h2><p>{en?"Drag start/end markers, audition the selection and export a WAV with optional fades. All locally.":"Start-/Endmarken ziehen, Auswahl vorhören und mit optionalen Fades als WAV exportieren. Alles lokal."}</p><div className="tool-tags"><span>WAVEFORM</span><span>FADE</span><span>WAV</span></div><strong>{en?"Open cutter":"Cutter öffnen"}<ArrowRight size={16}/></strong></Link>
    </section>
    <section className="tools-grid" aria-label={en ? "Voice and separation tools" : "Sprach- und Trennungs-Tools"}>
      <Link className="tool-card" href={en?"/en/tools/speech-cleaner":"/tools/speech-cleaner"}><div className="tool-card-icon"><Mic2 size={27}/></div><span className="tool-status live">LIVE</span><h2>{en?"Podcast & Voice Cleaner":"Podcast- & Sprachbereiniger"}</h2><p>{en?"Reduce steady background noise, filter rumble and even out speech levels. Compare and download a WAV.":"Gleichmäßiges Rauschen reduzieren, Rumpeln filtern und Sprachpegel ausgleichen. Vergleichen und WAV herunterladen."}</p><div className="tool-tags"><span>VOICE</span><span>A/B</span><span>WAV</span></div><strong>{en?"Clean up voice":"Sprache bereinigen"}<ArrowRight size={16}/></strong></Link>
      {(["vocal-remover", "stem-separation"] as const).map(tool => <Link key={tool} className="tool-card" href={`${en ? "/en" : ""}/tools/${tool}`}><div className="tool-card-icon"><Waves size={27}/></div><span className="tool-status">{en ? "ACTIVATION REQUIRED" : "MIT FREISCHALTUNG"}</span><h2>{tool === "vocal-remover" ? "Vocal Remover" : "Stem Separation"}</h2><p>{en ? "Try a short excerpt after signing in. Full-track separation and downloads require activation. Server availability applies." : "Nach Anmeldung einen kurzen Ausschnitt testen. Vollständige Trennung und Downloads nach Freischaltung. Abhängig von der Serververfügbarkeit."}</p><strong>{en ? "View tool" : "Tool ansehen"}<ArrowRight size={16}/></strong></Link>)}
    </section>
    <PracticeHub lang={lang}/>
    <section className="tools-principles"><Gauge size={22} /><div><strong>{en ? "Measurements, not magic." : "Messwerte statt Magie."}</strong><span>{en ? "Every result explains what was measured and what is only an estimate." : "Jedes Ergebnis erklärt, was gemessen wurde und was lediglich eine Prognose ist."}</span></div></section>
  </>;
}
