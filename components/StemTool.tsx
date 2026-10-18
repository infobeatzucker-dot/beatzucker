"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Layers3, Mic2, Upload, LockKeyhole, Download, Waves } from "lucide-react";
import type { Lang } from "@/lib/types/mastering";
import ToolLanguageNav from "./ToolLanguageNav";
import "./stem-tool.css";

type Job = { id: string; tool: string; mode: "preview" | "full"; status: string; stems: string[]; error?: string };
export default function StemTool({ lang, tool }: { lang: Lang; tool: "vocal-remover" | "stem-separation" }) {
  const en = lang === "en", vocal = tool === "vocal-remover";
  const [available, setAvailable] = useState(false), [signedIn, setSignedIn] = useState(true), [allowed, setAllowed] = useState(false);
  const [file, setFile] = useState<File | null>(null), [busy, setBusy] = useState(false), [loaded, setLoaded] = useState(false);
  const [job, setJob] = useState<Job | null>(null), [message, setMessage] = useState(""), [stem, setStem] = useState("vocals");
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await fetch("/api/stems", { signal: controller.signal, cache: "no-store" });
        if (response.status === 401) { setSignedIn(false); return; }
        const body = await response.json();
        if (!response.ok) throw Error(body.error || "Service unavailable");
        setAvailable(body.available); setAllowed(!!body.permissions?.[vocal ? "vocalRemoverEnabled" : "stemSeparationEnabled"]);
        const latest = (body.jobs as Job[]).find(item => item.tool === tool);
        setJob(latest ?? null);
      } catch (error) { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Service unavailable"); }
      finally { if (!controller.signal.aborted) { setLoaded(true); timer = setTimeout(poll, 4000); } }
    }
    void poll(); return () => { controller.abort(); clearTimeout(timer); };
  }, [tool, vocal]);
  async function submit(mode: "preview" | "full") {
    if (!file || busy) return;
    audio.current?.pause(); setBusy(true); setMessage(""); setStem("vocals");
    try {
      const form = new FormData(); form.set("file", file); form.set("tool", tool); form.set("mode", mode);
      const response = await fetch("/api/stems", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw Error(typeof body.error === "string" ? body.error : typeof body.detail === "string" ? body.detail : (en ? "Could not start. Try again later." : "Start nicht möglich. Bitte später erneut versuchen."));
      setJob(body);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Upload failed"); }
    finally { setBusy(false); }
  }
  const active = job && ["uploading", "queued", "running"].includes(job.status);
  const status = job?.status === "done" ? (en ? "Your tracks are ready" : "Deine Spuren sind bereit") : job?.status === "running" ? (en ? "Separating your music — this may take several minutes" : "Deine Musik wird getrennt – das kann einige Minuten dauern") : job?.status === "queued" ? (en ? "Waiting in the queue" : "Wartet in der Warteschlange") : job?.status === "error" ? (en ? "Separation failed. Please check your audio and try again." : "Trennung fehlgeschlagen. Bitte Audio prüfen und erneut versuchen.") : "";
  const canPlay = job?.status === "done" && (job.mode === "preview" || allowed);
  return <section className="stem-lab">
    <ToolLanguageNav lang={lang}/>
    <div className="stem-emblem">{vocal ? <Mic2 size={38}/> : <Layers3 size={38}/>}</div>
    <span className="tools-kicker">BEATZUCKER SEPARATION LAB</span>
    <h1>{vocal ? "Vocal Remover" : "Stem Separation"}</h1>
    <p className="stem-intro">{en ? (vocal ? "Hear the voice. Discover the instrumental." : "Discover the layers inside your song: vocals, drums, bass and other instruments.") : (vocal ? "Hör die Stimme. Entdecke das Instrumental." : "Entdecke die Ebenen deines Songs: Stimme, Drums, Bass und übrige Instrumente.")}</p>
    <div className="stem-console">
      <div className="stem-access"><LockKeyhole size={18}/>{allowed ? (en ? "Full access enabled" : "Vollzugriff freigeschaltet") : (en ? "20-second trial · full downloads require admin activation" : "20 Sekunden testen · volle Downloads nach Admin-Freischaltung")}</div>
      {!signedIn ? <p><Link href="/login">{en ? "Sign in to try the tools" : "Zum Testen anmelden"}</Link></p> : !loaded ? <p role="status">{en ? "Checking availability…" : "Verfügbarkeit wird geprüft…"}</p> : !available ? <p role="status">{en ? "The separation worker is not activated yet. Please check back after the server upgrade." : "Der Trennungsdienst ist noch nicht aktiviert. Bitte nach dem Serverausbau erneut vorbeischauen."}</p> : <>
        <label className="stem-upload"><Upload size={28}/><strong>{file?.name ?? (en ? "Choose your track" : "Wähle deinen Track")}</strong><span>WAV · FLAC · MP3 · AAC · 40 MB · {en ? "max. 6 minutes" : "max. 6 Minuten"}</span><span className="stem-upload-cta">{en ? "Choose audio file" : "Audiodatei auswählen"}</span><input className="stem-file-input" type="file" accept="audio/*,.wav,.flac,.mp3,.m4a" disabled={busy || !!active} onChange={event => { const chosen = event.target.files?.[0]; if (chosen && chosen.size > 40 * 1024 * 1024) { setMessage(en ? "Maximum 40 MB." : "Maximal 40 MB."); setFile(null); } else setFile(chosen ?? null); }}/></label>
        <div className="stem-actions"><button disabled={!file || busy || !!active} onClick={() => void submit("preview")}>{en ? "Try 20 seconds" : "20 Sekunden testen"}</button><button disabled={!allowed || !file || busy || !!active} onClick={() => void submit("full")}>{en ? "Separate full track" : "Ganzen Track trennen"}</button></div>
      </>}
      {busy && <p role="status">{en ? "Uploading…" : "Wird hochgeladen…"}</p>}
      {status && <div className={`stem-job ${active ? "is-active" : ""}`} role="status"><Waves size={24}/>{status}</div>}
      {message && <p role="alert">{message}</p>}
      {canPlay && <div className="stem-results"><div className="stem-tabs">{job.stems.map(name => <button key={name} aria-pressed={stem === name} onClick={() => { audio.current?.pause(); setStem(name); }}>{({ vocals: en ? "Vocals" : "Stimme", instrumental: "Instrumental", drums: "Drums", bass: "Bass", other: en ? "Other" : "Übrige" } as Record<string,string>)[name]}</button>)}</div>
        <audio ref={audio} key={`${job.id}-${stem}`} controls preload="none" controlsList={job.mode === "preview" ? "nodownload" : undefined} src={`/api/stems?id=${job.id}&asset=${stem}`}/>
        {job.mode === "full" && allowed ? <div className="stem-downloads">{job.stems.map(name => <a key={name} href={`/api/stems?id=${job.id}&asset=${name}`} download><Download size={16}/>{name} · WAV</a>)}</div> : <p>{en ? "Trial: only the first 20 seconds are processed. Full stems are not provided. Audio played in a browser can still be recorded." : "Test: Nur die ersten 20 Sekunden werden verarbeitet. Vollständige Spuren werden nicht bereitgestellt. Im Browser abgespieltes Audio lässt sich dennoch aufnehmen."}</p>}
      </div>}
    </div>
    <div className="stem-notes"><p>{en ? "Neural separation can leave artifacts or bleed. This is not a replacement for original multitracks. Stems retain their shared levels; lower playback volume if needed." : "Neuronale Trennung kann Artefakte und Übersprechen hinterlassen. Sie ersetzt keine Original-Einzelspuren. Die gemeinsamen Pegel bleiben erhalten; Wiedergabelautstärke bei Bedarf reduzieren."}</p><p>{en ? "Use only audio you have permission to process. Results expire after 24 hours. Daily limits (UTC): 3 trial attempts and 2 full attempts, shared by both tools, including failed processing. No mastering credits are deducted." : "Verwende nur Audio, das du verarbeiten darfst. Ergebnisse verfallen nach 24 Stunden. Tageslimits (UTC): 3 Testversuche und 2 vollständige Versuche, gemeinsam für beide Tools, auch bei Verarbeitungsfehlern. Keine Abbuchung von Mastering-Credits."}</p></div>
  </section>;
}
