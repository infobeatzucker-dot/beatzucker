"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, FileAudio, Loader2, RotateCcw, ShieldCheck, UploadCloud } from "lucide-react";
import AnalysisPanel from "@/components/AnalysisPanel";
import type { AnalysisData, Lang } from "@/lib/types/mastering";

type Status = "idle" | "checking" | "done" | "error";
type Check = { label: string; detail: string; state: "good" | "warn" | "bad" };

function buildChecks(a: AnalysisData, lang: Lang): Check[] {
  return [
    a.clipping_detected
      ? { label: lang === "de" ? "Clipping erkannt" : "Clipping detected", detail: lang === "de" ? "Spitzen überschreiten den sicheren digitalen Bereich." : "Peaks exceed the safe digital range.", state: "bad" }
      : { label: lang === "de" ? "Keine Clipping-Spitzen" : "No clipped peaks", detail: lang === "de" ? "Die Analyse hat keine harten Übersteuerungen gefunden." : "The analysis found no hard digital clipping.", state: "good" },
    a.true_peak <= -3
      ? { label: lang === "de" ? "Guter Headroom" : "Healthy headroom", detail: `${a.true_peak.toFixed(1)} dBTP`, state: "good" }
      : a.true_peak <= -1
        ? { label: lang === "de" ? "Knapp bemessener Headroom" : "Limited headroom", detail: `${a.true_peak.toFixed(1)} dBTP`, state: "warn" }
        : { label: lang === "de" ? "Sehr wenig Headroom" : "Very little headroom", detail: `${a.true_peak.toFixed(1)} dBTP`, state: "bad" },
    a.dr_value >= 8
      ? { label: lang === "de" ? "Dynamik bietet Spielraum" : "Dynamics leave room", detail: `DR ${a.dr_value.toFixed(0)} · Crest ${a.crest_factor.toFixed(1)} dB`, state: "good" }
      : a.dr_value >= 6
        ? { label: lang === "de" ? "Dynamik bereits verdichtet" : "Dynamics already dense", detail: `DR ${a.dr_value.toFixed(0)} · Crest ${a.crest_factor.toFixed(1)} dB`, state: "warn" }
        : { label: lang === "de" ? "Sehr stark verdichtet" : "Very heavily compressed", detail: `DR ${a.dr_value.toFixed(0)} · Crest ${a.crest_factor.toFixed(1)} dB`, state: "bad" },
    a.mono_compatibility >= 0.7
      ? { label: lang === "de" ? "Mono-kompatibel" : "Mono compatible", detail: a.mono_compatibility.toFixed(2), state: "good" }
      : a.mono_compatibility >= 0.5
        ? { label: lang === "de" ? "Mono-Kompatibilität prüfen" : "Check mono compatibility", detail: a.mono_compatibility.toFixed(2), state: "warn" }
        : { label: lang === "de" ? "Phasenrisiko" : "Phase-cancellation risk", detail: a.mono_compatibility.toFixed(2), state: "bad" },
    Math.abs(a.dc_offset) <= 0.001
      ? { label: lang === "de" ? "Kein relevanter DC-Offset" : "No relevant DC offset", detail: a.dc_offset.toFixed(4), state: "good" }
      : { label: lang === "de" ? "DC-Offset vorhanden" : "DC offset present", detail: a.dc_offset.toFixed(4), state: Math.abs(a.dc_offset) <= 0.01 ? "warn" : "bad" },
  ];
}

export default function PublicMixCheck({ lang = "de" }: { lang?: Lang }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [filename, setFilename] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const checks = useMemo(() => analysis ? buildChecks(analysis, lang) : [], [analysis, lang]);
  const score = useMemo(() => {
    if (!checks.length) return 0;
    const earned = checks.reduce((sum, check) => sum + (check.state === "good" ? 2 : check.state === "warn" ? 1 : 0), 0);
    return Math.round((earned / (checks.length * 2)) * 100);
  }, [checks]);

  async function run(file: File) {
    setError("");
    if (file.size > 40 * 1024 * 1024) { setError(lang === "de" ? "Die Datei ist größer als 40 MB." : "The file is larger than 40 MB."); setStatus("error"); return; }
    setStatus("checking"); setFilename(file.name);
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch("/api/mix-check", { method: "POST", body });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.analysis) throw new Error(payload.error || "Analysis failed");
      setAnalysis(payload.analysis); setFilename(payload.filename || file.name); setStatus("done");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : (lang === "de" ? "Analyse fehlgeschlagen." : "Analysis failed."));
      setStatus("error");
    }
  }

  function reset() { setStatus("idle"); setAnalysis(null); setFilename(""); setError(""); if (inputRef.current) inputRef.current.value = ""; }

  return (
    <>
      <section className="mixcheck-shell">
        <div className="mixcheck-intro">
          <span className="mixcheck-badge"><ShieldCheck size={14} /> {lang === "de" ? "ÖFFENTLICH · OHNE KONTO" : "PUBLIC · NO ACCOUNT"}</span>
          <h1>{lang === "de" ? <>Ist dein Mix <em>bereit fürs Mastering?</em></> : <>Is your mix <em>ready for mastering?</em></>}</h1>
          <p>{lang === "de" ? "Lass Headroom, Dynamik, Clipping, Stereo-/Mono-Verhalten und technische Dateidaten prüfen – ohne den Track zu mastern." : "Check headroom, dynamics, clipping, stereo/mono behavior and technical file data without mastering the track."}</p>
        </div>

        {status !== "done" && (
          <div className={`mixcheck-drop ${dragging ? "dragging" : ""} ${status === "checking" ? "busy" : ""}`}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file) void run(file); }}
            onClick={() => status !== "checking" && inputRef.current?.click()}>
            <div className="mixcheck-drop-icon">{status === "checking" ? <Loader2 className="mixcheck-spin" size={30} /> : <UploadCloud size={30} />}</div>
            <h2>{status === "checking" ? (lang === "de" ? "Mix wird technisch vermessen …" : "Measuring your mix …") : (lang === "de" ? "Track hier ablegen" : "Drop your track here")}</h2>
            <p>{status === "checking" ? filename : (lang === "de" ? "oder klicken und Datei auswählen" : "or click to choose a file")}</p>
            <div className="mixcheck-formats"><span>WAV</span><span>FLAC</span><span>MP3</span><span>AIFF</span></div>
            <small>{lang === "de" ? "Max. 40 MB · max. 10 Minuten · 3 Checks pro Stunde" : "Max 40 MB · max 10 minutes · 3 checks per hour"}</small>
            <input ref={inputRef} type="file" hidden accept=".wav,.flac,.mp3,.aiff,.aif,audio/wav,audio/flac,audio/mpeg,audio/aiff" onChange={(event) => { const file = event.target.files?.[0]; if (file) void run(file); }} />
          </div>
        )}

        {status === "error" && <div className="mixcheck-error"><AlertTriangle size={16} /><span>{error}</span><button onClick={reset}>{lang === "de" ? "Erneut versuchen" : "Try again"}</button></div>}

        {status === "done" && analysis && (
          <div className="mixcheck-result">
            <div className="mixcheck-score-card">
              <div className="mixcheck-score" style={{ "--score": `${score * 3.6}deg` } as React.CSSProperties}><div><strong>{score}</strong><span>/100</span></div></div>
              <div><span className="mixcheck-result-label">{lang === "de" ? "MIX-CHECK ERGEBNIS" : "MIX CHECK RESULT"}</span><h2>{score >= 80 ? (lang === "de" ? "Technisch gut vorbereitet" : "Technically well prepared") : score >= 55 ? (lang === "de" ? "Einige Punkte solltest du prüfen" : "A few points need attention") : (lang === "de" ? "Vor dem Mastering nacharbeiten" : "Revise before mastering")}</h2><p><FileAudio size={14} /> {filename}</p></div>
              <button onClick={reset}><RotateCcw size={14} /> {lang === "de" ? "Anderen Track prüfen" : "Check another track"}</button>
            </div>
            <div className="mixcheck-checks">{checks.map((check) => <div key={check.label} className={`mixcheck-check ${check.state}`}>{check.state === "good" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}<div><strong>{check.label}</strong><span>{check.detail}</span></div></div>)}</div>
            <p className="mixcheck-disclaimer">{lang === "de" ? "Der Score ist eine technische Orientierung, keine Bewertung von Musik, Geschmack oder künstlerischer Qualität." : "The score is technical guidance, not a judgment of the music, taste or artistic quality."}</p>
          </div>
        )}
      </section>

      {status === "done" && analysis && <div className="mixcheck-analysis"><AnalysisPanel preAnalysis={analysis} postAnalysis={null} isProcessing={false} lang={lang} /></div>}

      <section className="mixcheck-privacy"><ShieldCheck size={18} /><div><strong>{lang === "de" ? "Dein Track bleibt deiner." : "Your track stays yours."}</strong><span>{lang === "de" ? "Die Upload-Datei wird unmittelbar nach der Analyse gelöscht. Kein Account, kein Mastering, kein Audioarchiv." : "The uploaded file is deleted immediately after analysis. No account, no mastering, no audio archive."}</span></div></section>

      {status === "done" && <section className="mixcheck-cta"><h2>{lang === "de" ? "Bereit für den nächsten Schritt?" : "Ready for the next step?"}</h2><p>{lang === "de" ? "Mastere den geprüften Mix mit Beatzucker und vergleiche das Ergebnis direkt per A/B." : "Master the checked mix with Beatzucker and compare the result directly with A/B playback."}</p><Link href={lang === "en" ? "/en#mastering" : "/#mastering"}>{lang === "de" ? "Jetzt kostenlos mastern" : "Master for free"} <ArrowRight size={16} /></Link></section>}
    </>
  );
}
