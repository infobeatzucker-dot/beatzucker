"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowDown, Layers3, Mic2, Upload, LockKeyhole, Download, Waves } from "lucide-react";
import AuthModal from "./AuthModal";
import type { Lang } from "@/lib/types/mastering";
import ToolLanguageNav from "./ToolLanguageNav";
import StemMixer from "./StemMixer";
import "./stem-tool.css";

type Job = { id: string; tool: string; mode: "preview" | "full"; status: string; stems: string[]; error?: string };
const vocalDemo = ["vocals", "instrumental"], stemDemo = ["vocals", "drums", "bass", "other"];
export default function StemTool({ lang, tool }: { lang: Lang; tool: "vocal-remover" | "stem-separation" }) {
  const en = lang === "en", vocal = tool === "vocal-remover";
  const { status: sessionStatus } = useSession();
  const [available, setAvailable] = useState(false), [signedIn, setSignedIn] = useState(true), [allowed, setAllowed] = useState(false);
  const [file, setFile] = useState<File | null>(null), [busy, setBusy] = useState(false), [loaded, setLoaded] = useState(false);
  const [job, setJob] = useState<Job | null>(null), [message, setMessage] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  useEffect(() => {
    if (sessionStatus !== "authenticated") {
      setSignedIn(sessionStatus === "loading");
      setLoaded(sessionStatus !== "loading");
      setJob(null);
      return;
    }
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    setLoaded(false);
    setSignedIn(true);
    async function poll() {
      let again = true;
      try {
        const response = await fetch("/api/stems", { signal: controller.signal, cache: "no-store" });
        if (response.status === 401) { setSignedIn(false); setJob(null); again = false; return; }
        const body = await response.json();
        if (!response.ok) throw Error(body.error || "Service unavailable");
        setSignedIn(true);
        setAvailable(body.available); setAllowed(!!body.permissions?.[vocal ? "vocalRemoverEnabled" : "stemSeparationEnabled"]);
        const latest = (body.jobs as Job[]).find(item => item.tool === tool);
        setJob(latest ?? null);
      } catch (error) { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Service unavailable"); }
      finally { if (!controller.signal.aborted) { setLoaded(true); if (again) timer = setTimeout(poll, 4000); } }
    }
    void poll(); return () => { controller.abort(); clearTimeout(timer); };
  }, [tool, vocal, sessionStatus]);
  async function submit(mode: "preview" | "full") {
    if (!file || busy) return;
    setBusy(true); setMessage("");
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
  const canPlay = signedIn && sessionStatus === "authenticated" && job?.status === "done" && (job.mode === "preview" || allowed);
  return <section className="stem-lab">
    <ToolLanguageNav lang={lang}/>
    <div className="stem-emblem">{vocal ? <Mic2 size={38}/> : <Layers3 size={38}/>}</div>
    <span className="tools-kicker">BEATZUCKER SEPARATION LAB</span>
    <h1>{vocal ? "Vocal Remover" : "Stem Separation"}</h1>
    <p className="stem-intro">{en ? (vocal ? "Hear the voice. Discover the instrumental." : "Discover the layers inside your song: vocals, drums, bass and other instruments.") : (vocal ? "Hör die Stimme. Entdecke das Instrumental." : "Entdecke die Ebenen deines Songs: Stimme, Drums, Bass und übrige Instrumente.")}</p>
    <section className="stem-public-demo" id="demo" aria-labelledby="stem-demo-heading">
      <div className="stem-demo-heading">
        <div><h2 id="stem-demo-heading">{en ? "Try the mixer with a demo track" : "Mischpult mit einem Demosong ausprobieren"}</h2>
          <p>{en ? "Hear the separated tracks from “Lass mich nicht allein”. Press play and use Solo to listen to one track at a time. No account needed." : "Hör die getrennten Spuren von „Lass mich nicht allein“. Starte die Wiedergabe und nutze Solo, um eine Spur einzeln zu hören. Die Demo läuft ohne Konto."}</p>
        </div>
        <a href="#separation-upload">{en ? "Use your own song" : "Eigenen Song verwenden"}<ArrowDown size={15} aria-hidden="true"/></a>
      </div>
      <StemMixer demo stems={vocal ? vocalDemo : stemDemo} lang={lang}/>
    </section>
    <div className="stem-console" id="separation-upload">
      <div className="stem-access"><LockKeyhole size={18}/>{allowed ? (en ? "Full access enabled" : "Vollzugriff freigeschaltet") : (en ? "20-second trial · full downloads require admin activation" : "20 Sekunden testen · volle Downloads nach Admin-Freischaltung")}</div>
      {!signedIn ? <button type="button" onClick={() => setAuthOpen(true)}>{en ? "Sign in to try your own song" : "Für deinen eigenen Song anmelden"}</button> : !loaded ? <p role="status">{en ? "Checking availability…" : "Verfügbarkeit wird geprüft…"}</p> : !available ? <p role="status">{en ? "Processing your own songs is currently unavailable. You can try the demo above." : "Eigene Songs können gerade nicht verarbeitet werden. Das Demo-Mischpult oben kannst du ausprobieren."}</p> : <>
        <label className="stem-upload"><Upload size={28}/><strong>{file?.name ?? (en ? "Choose your track" : "Wähle deinen Track")}</strong><span>WAV · FLAC · MP3 · AAC · 40 MB · {en ? "max. 6 minutes" : "max. 6 Minuten"}</span><span className="stem-upload-cta">{en ? "Choose audio file" : "Audiodatei auswählen"}</span><input className="stem-file-input" type="file" accept="audio/*,.wav,.flac,.mp3,.m4a" disabled={busy || !!active} onChange={event => { const chosen = event.target.files?.[0]; if (chosen && chosen.size > 40 * 1024 * 1024) { setMessage(en ? "Maximum 40 MB." : "Maximal 40 MB."); setFile(null); } else setFile(chosen ?? null); }}/></label>
        <div className="stem-actions"><button disabled={!file || busy || !!active} onClick={() => void submit("preview")}>{en ? "Try 20 seconds" : "20 Sekunden testen"}</button><button disabled={!allowed || !file || busy || !!active} onClick={() => void submit("full")}>{en ? "Separate full track" : "Ganzen Track trennen"}</button></div>
      </>}
      {busy && <p role="status">{en ? "Uploading…" : "Wird hochgeladen…"}</p>}
      {status && <div className={`stem-job ${active ? "is-active" : ""}`} role="status"><Waves size={24}/>{status}</div>}
      {message && <p role="alert">{message}</p>}
      {canPlay && !busy && job.stems.length > 0 && <div className="stem-results">
        <StemMixer key={`${job.id}:${job.stems.join(",")}`} id={job.id} stems={job.stems} lang={lang}/>
        {job.mode === "full" && allowed ? <div className="stem-downloads">{job.stems.map(name => <a key={name} href={`/api/stems?id=${job.id}&asset=${name}`} download><Download size={16}/>{name} · WAV</a>)}</div> : <p>{en ? "Trial: only the first 20 seconds are processed. Full stems are not provided. Audio played in a browser can still be recorded." : "Test: Nur die ersten 20 Sekunden werden verarbeitet. Vollständige Spuren werden nicht bereitgestellt. Im Browser abgespieltes Audio lässt sich dennoch aufnehmen."}</p>}
      </div>}
    </div>
    {authOpen && <AuthModal open onClose={() => setAuthOpen(false)} lang={lang} returnTo={`${en ? "/en" : ""}/tools/${tool}#separation-upload`}/>}
    <div className="stem-notes"><p>{en ? "Neural separation can leave artifacts or bleed. This is not a replacement for original multitracks. Stems retain their shared levels; lower playback volume if needed." : "Neuronale Trennung kann Artefakte und Übersprechen hinterlassen. Sie ersetzt keine Original-Einzelspuren. Die gemeinsamen Pegel bleiben erhalten; Wiedergabelautstärke bei Bedarf reduzieren."}</p><p>{en ? "Use only audio you have permission to process. Results expire after 24 hours. Daily limits (UTC): 3 trial attempts and 2 full attempts, shared by both tools, including failed processing. No mastering credits are deducted." : "Verwende nur Audio, das du verarbeiten darfst. Ergebnisse verfallen nach 24 Stunden. Tageslimits (UTC): 3 Testversuche und 2 vollständige Versuche, gemeinsam für beide Tools, auch bei Verarbeitungsfehlern. Keine Abbuchung von Mastering-Credits."}</p></div>
  </section>;
}
