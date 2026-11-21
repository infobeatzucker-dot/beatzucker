"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, Download, LockKeyhole, Sparkles } from "lucide-react";
import AuthModal from "@/components/AuthModal";
import ReleaseHandoff from "@/components/ReleaseHandoff";
import { DONATE_URL } from "@/lib/constants";
import { labFormats, labGenres, labMaxBytes, labPlatforms, labTargets, type LabFormat } from "@/lib/masteringLab";
import type { AnalysisData } from "@/lib/types/mastering";
import { renderLabBuffer } from "./audio";
import { appliedAutoProfile, deliveryWav, wavByteLength } from "./delivery";
import { type Module, type Settings } from "./settings";
import styles from "./lab.module.css";

type Analysis = { fileId: string; uploadToken: string; analysis: AnalysisData };
type DeliveryResult = { loudness: string | null; peak: string | null; correction: string | null; name: string; reached: boolean; file: File };
const genreLabels = {
  auto: ["Automatisch", "Auto"], pop: ["Pop", "Pop"], electronic: ["Electronic", "Electronic"],
  hiphop: ["Hip-Hop", "Hip-hop"], rock: ["Rock", "Rock"], metal: ["Metal", "Metal"],
  rnb: ["R&B / Soul", "R&B / Soul"], jazz: ["Jazz", "Jazz"], classical: ["Klassik", "Classical"],
  ambient: ["Ambient", "Ambient"], country: ["Country", "Country"],
  dance: ["Dance", "Dance"], edm: ["EDM", "EDM"], house: ["House", "House"], techno: ["Techno", "Techno"],
  dnb: ["Drum & Bass", "Drum & Bass"], trap: ["Trap", "Trap"], latin: ["Latin", "Latin"], reggae: ["Reggae", "Reggae"],
  acoustic: ["Akustik", "Acoustic"], lofi: ["Lo-Fi", "Lo-fi"], podcast: ["Podcast", "Podcast"],
} satisfies Record<typeof labGenres[number], [string, string]>;

function json(body: object, signal: AbortSignal) {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal };
}
async function read<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

export function LabDelivery({ lang, source, buffer, settings, target, onTarget, onProfile, sidechain = false, moduleNames, renderAudio }: {
  lang: "de" | "en"; source?: File; buffer?: AudioBuffer; settings: Settings; target: number | null;
  onTarget: (value: number | null) => void;
  onProfile: (settings: Settings, target: number, name: string) => void;
  sidechain?: boolean;
  moduleNames?: Record<Module, string>;
  renderAudio?: () => Promise<AudioBuffer>;
}) {
  const en = lang === "en";
  const t = (de: string, enValue: string) => en ? enValue : de;
  const { status } = useSession();
  const [login, setLogin] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [format, setFormat] = useState<LabFormat>("wav24");
  const [platform, setPlatform] = useState<typeof labTargets[number]>("spotify");
  const [genre, setGenre] = useState<typeof labGenres[number]>("auto");
  const [intensity, setIntensity] = useState(65);
  const [customTarget, setCustomTarget] = useState(-14);
  const [busy, setBusy] = useState<"analysis" | "render" | "encode" | null>(null);
  const [warning, setWarning] = useState("");
  const [result, setResult] = useState<DeliveryResult>();
  const [phase, setPhase] = useState(0);
  const [proposal, setProposal] = useState<{ settings: Settings; target: number; name: string; analysis: AnalysisData }>();
  const request = useRef<AbortController | null>(null);
  const analyzed = useRef<{ source: File; data: Analysis } | undefined>(undefined);
  const hasTrack = Boolean(source && buffer);
  const sizeAllowed = !buffer || wavByteLength(buffer.length, renderAudio ? buffer.numberOfChannels : 2) <= labMaxBytes;
  const envelope = useMemo(() => {
    if (!buffer?.length) return [];
    const signal = buffer.getChannelData(0);
    const count = Math.min(33, signal.length);
    return Array.from({ length: count }, (_, i) => {
      const start = Math.floor(i * signal.length / count);
      const end = Math.floor((i + 1) * signal.length / count);
      let peak = 0;
      for (let j = start; j < end; j += 4) peak = Math.max(peak, Math.abs(signal[j]));
      return Math.max(5, Math.min(100, peak * 100));
    });
  }, [buffer]);

  async function refreshAccess(signal?: AbortSignal) {
    const response = await fetch("/api/mastering-lab", { cache: "no-store", signal });
    const access = await read<{ enabled: boolean }>(response);
    if (!signal?.aborted) setEnabled(access.enabled);
    return access.enabled;
  }

  useEffect(() => {
    if (status !== "authenticated") { setEnabled(null); return; }
    const controller = new AbortController();
    const refresh = () => { void refreshAccess(controller.signal).catch(() => {
      if (!controller.signal.aborted) setEnabled(null);
    }); };
    refresh();
    window.addEventListener("focus", refresh);
    return () => { controller.abort(); window.removeEventListener("focus", refresh); };
  }, [status]);

  useEffect(() => {
    setBusy(null);
    setWarning("");
    setResult(undefined);
    setProposal(undefined);
    analyzed.current = undefined;
    return () => { request.current?.abort(); request.current = null; };
  }, [source]);

  async function analyze() {
    if (status !== "authenticated") { setLogin(true); return; }
    if (!source || request.current) return;
    const task = new AbortController();
    request.current = task;
    setWarning("");
    setProposal(undefined);
    setPhase(0);
    setBusy("analysis");
    try {
      let info = analyzed.current?.source === source ? analyzed.current.data : undefined;
      if (!info) {
        const payload = new FormData();
        payload.set("file", source, source.name);
        const upload = await read<{ file_id: string; upload_token: string }>(await fetch("/api/upload", { method: "POST", body: payload, signal: task.signal }));
        setPhase(1);
        const analysis = await read<AnalysisData>(await fetch("/api/analyze", json(upload, task.signal)));
        info = { fileId: upload.file_id, uploadToken: upload.upload_token, analysis };
        if (task.signal.aborted) return;
        analyzed.current = { source, data: info };
      }
      setPhase(2);
      const profile = await read<Record<string, unknown>>(await fetch("/api/mastering-lab", json({
        ...info, analysisToken: info.analysis.analysis_token, platform, preset: genre, intensity, target: customTarget,
      }, task.signal)));
      if (task.signal.aborted) return;
      if (typeof profile.target_lufs !== "number") throw new Error("Invalid profile");
      const name = genre === "auto" ? t("Adaptiv", "Adaptive") : genreLabels[genre][en ? 1 : 0];
      setProposal({ settings: appliedAutoProfile(profile, info.analysis.integrated_lufs, info.analysis.true_peak),
        target: profile.target_lufs, name, analysis: info.analysis });
    } catch (error) {
      if (!task.signal.aborted) {
        const code = error instanceof Error ? error.message : "";
        if (code === "401") setLogin(true);
        else setWarning(code === "429" || code === "503"
          ? t("Die Analyse ist gerade ausgelastet. Versuche es gleich erneut.", "Analysis is busy. Please try again shortly.")
          : t("Auto-Werte konnten nicht geladen werden. Prüfe Dateiformat und Anmeldung.", "Could not load auto settings. Check the file format and sign-in."));
      }
    } finally {
      if (request.current === task) { request.current = null; setBusy(null); }
    }
  }

  async function save() {
    if (status !== "authenticated") { setLogin(true); return; }
    if (!source || !buffer || request.current || !sizeAllowed) return;
    const task = new AbortController();
    request.current = task;
    setWarning("");
    setResult(undefined);
    setBusy("render");
    try {
      if (!await refreshAccess(task.signal)) return;
      const rendered = await (renderAudio ? renderAudio() : renderLabBuffer(buffer, settings));
      if (task.signal.aborted) return;
      const wav = deliveryWav(rendered);
      setBusy("encode");
      const name = source.name.replace(/\.[^.]+$/, "");
      const ceiling = settings.active.limiter ? settings.ceiling : -.1;
      const query = new URLSearchParams({ name, format, ceiling: String(ceiling) });
      if (target !== null) query.set("target", String(target));
      const response = await fetch("/api/mastering-lab/export?" + query, {
        method: "POST", headers: { "Content-Type": "audio/wav" }, body: wav, signal: task.signal,
      });
      if (response.status === 403) setEnabled(false);
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      if (task.signal.aborted) return;
      const filename = `${name || "track"}-${renderAudio ? "sidechain" : "master"}.${labFormats[format].ext}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      const loudness = response.headers.get("X-Lab-LUFS");
      const peak = response.headers.get("X-Lab-True-Peak");
      setResult({ name: filename, file: new File([blob],filename,{type:blob.type}), loudness, peak, correction: response.headers.get("X-Lab-Gain"),
        reached: target !== null && loudness !== null && peak !== null && Math.abs(Number(loudness) - target) <= .55 && Number(peak) <= ceiling + .05 });
    } catch (error) {
      if (!task.signal.aborted) {
        const code = error instanceof Error ? error.message : "";
        setWarning(code === "403" ? t("Die Freischaltung für dieses Konto fehlt.", "This account needs download activation.")
          : code === "429" || code === "503" ? t("Export ist gerade ausgelastet. Versuche es gleich erneut.", "Export is busy. Please try again shortly.")
            : t("Datei konnte nicht exportiert werden.", "The file could not be exported."));
      }
    } finally {
      if (request.current === task) { request.current = null; setBusy(null); }
    }
  }

  return <div className={styles.delivery} data-sidechain={sidechain}>
    {!sidechain && <section aria-labelledby="lab-autoprof">
      <h2 id="lab-autoprof"><Sparkles size={18} aria-hidden="true" /> {t("Auto-Master-Werte", "Auto-master settings")}</h2>
      <p>{t("Track analysieren und die passenden Startwerte in die editierbaren Lab-Regler laden.", "Analyze the track and load starting values into the editable Lab controls.")}</p>
      <div className={styles.deliveryFields}>
        <label>{t("Plattform", "Platform")} <select aria-label={t("Plattform", "Platform")} disabled={Boolean(busy)} value={platform} onChange={event => { setPlatform(event.target.value as typeof platform); setProposal(undefined); }}>
          <optgroup label="Streaming">{labTargets.filter(key => !["club", "broadcast", "custom"].includes(key)).map(key => <option key={key} value={key}>{labPlatforms[key].join(" · ")} LUFS</option>)}</optgroup>
          <optgroup label={t("Weitere Ziele", "Other targets")}>
            <option value="club">Club · −9 LUFS</option><option value="broadcast">Broadcast · −23 LUFS</option><option value="custom">{t("Eigene LUFS", "Custom LUFS")}</option>
          </optgroup>
        </select></label>
        <label>Genre <select aria-label="Genre" disabled={Boolean(busy)} value={genre} onChange={event => { setGenre(event.target.value as typeof genre); setProposal(undefined); }}>
          {labGenres.map(key => <option key={key} value={key}>{genreLabels[key][en ? 1 : 0]}</option>)}
        </select></label>
        <label>{t("Intensität", "Intensity")} <input disabled={Boolean(busy)} type="number" min="0" max="100" step="1" value={intensity}
          onChange={event => { setIntensity(Math.max(0, Math.min(100, Math.round(+event.target.value)))); setProposal(undefined); }} /></label>
        {platform === "custom" && <label>{t("Ziel-LUFS", "Target LUFS")} <input disabled={Boolean(busy)} type="number" min="-23" max="-6" step=".5" value={customTarget}
          onChange={event => { setCustomTarget(+event.target.value); setProposal(undefined); }} onBlur={() => setCustomTarget(value => Math.max(-23, Math.min(-6, value)))} /></label>}
      </div>
      <button className={styles.primary} disabled={!hasTrack || Boolean(busy)} onClick={() => void analyze()}>
        {busy === "analysis" ? t("Track wird analysiert …", "Analyzing track…") : t("Auto-Werte vorschlagen", "Suggest auto settings")}
      </button>
      {busy === "analysis" && <div className={styles.analysisDisplay} role="status">
        <div className={styles.analysisSweep} aria-hidden="true">{envelope.map((height, index) => <i key={index}
          style={{ height: `${height}%`, animationDelay: `${index * -61}ms` }} />)}</div>
        <ol>{[t("Track übertragen", "Sending track"), t("Lautheit, Dynamik und Frequenzen messen", "Measuring loudness, dynamics and frequencies"), t("Startwerte berechnen", "Calculating starting values")].map((label, index) =>
          <li key={index} data-state={index === phase ? "active" : index < phase ? "done" : "pending"} aria-current={index === phase ? "step" : undefined}>{label}</li>)}</ol>
      </div>}
      {proposal && <div className={styles.deliveryResult} role="status">
        <strong>{proposal.name} · {proposal.target} LUFS</strong>
        <p>{t("Vorgeschlagene Module", "Suggested modules")}: {(Object.keys(proposal.settings.active) as Module[]).filter(key => proposal.settings.active[key]).map(key => moduleNames?.[key] ?? key).join(", ")}</p>
        <div><span>{t("Original", "Source")} <b>{proposal.analysis.integrated_lufs.toFixed(1)} LUFS</b></span><span>True Peak <b>{proposal.analysis.true_peak.toFixed(1)} dBTP</b></span></div>
        <div className={styles.bandReadout} aria-label={t("Frequenzbalance des Originals", "Source frequency balance")}>
          {(["sub", "low", "mid", "high", "air"] as const).map(band => {
            const level = proposal.analysis[`rms_${band}`];
            return <div key={band}><span>{band.toUpperCase()}</span><meter min={-80} max={0} value={Math.max(-80, Math.min(0, level))} aria-label={band}/><small>{level.toFixed(1)} dB</small></div>;
          })}
        </div>
        <button className={styles.primary} disabled={Boolean(busy)} onClick={() => { onProfile(proposal.settings, proposal.target, proposal.name); setProposal(undefined); }}>
          {t("Auto-Werte übernehmen", "Apply auto settings")}
        </button>
      </div>}
      <small>{t("Für diese Analyse wird eine temporäre Kopie des Tracks an Beatzucker gesendet.", "This analysis sends a temporary copy of the track to Beatzucker.")}</small>
    </section>}
    <section aria-labelledby="lab-delivery">
      <h2 id="lab-delivery"><AudioLines size={18} aria-hidden="true" /> {renderAudio ? t("Bassspur exportieren", "Export bass stem") : t("Finaler Export", "Final export")}</h2>
      <div className={styles.deliveryFields}>
        <label>Format <select value={format} onChange={event => setFormat(event.target.value as LabFormat)}>
          {Object.entries(labFormats).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}
        </select></label>
        {!sidechain && <label>{t("Ziel-LUFS", "Target LUFS")} <select value={target === null ? "" : target} onChange={event => onTarget(event.target.value === "" ? null : +event.target.value)}>
          <option value="">{t("Pegel beibehalten", "Keep level")}</option>
          {Array.from(new Set([...Array.from({ length: 35 }, (_, i) => -23 + i * .5), ...(target === null ? [] : [target])])).sort((a,b) => a-b).map(value => <option key={value} value={value}>{value} LUFS</option>)}
        </select></label>}
      </div>
      {status === "authenticated" && enabled === true ? <>
        <button className={styles.primary} disabled={!hasTrack || !sizeAllowed || Boolean(busy)} onClick={() => void save()}>
          <Download size={16} aria-hidden="true" /> {busy === "render" ? t("Master wird berechnet …", "Rendering master…")
            : busy === "encode" ? t("Datei wird codiert und gemessen …", "Encoding and measuring file…")
              : renderAudio ? t("Bass herunterladen", "Download bass") : t("Master exportieren", "Export master")}
        </button>
        {!sizeAllowed && <p>{t("Der Track überschreitet in unkomprimierter Form das Exportlimit von 192 MiB.", "The uncompressed track exceeds the 192 MiB export limit.")}</p>}
      </> : <>
        <p className={styles.lockText}><LockKeyhole size={15} aria-hidden="true" /> {t("Downloads benötigen eine dauerhafte Freischaltung durch das Beatzucker-Team.", "Downloads require permanent activation by the Beatzucker team.")}</p>
        <small>{t("Die Freischaltung gilt gemeinsam für Mastering Lab und Kick & Bass. Das Team prüft sie nach deiner Unterstützung manuell.", "One activation covers Mastering Lab and Kick & Bass. The team activates it manually after you support the project.")}</small>
        {status === "unauthenticated" && <button onClick={() => setLogin(true)}>{t("Anmelden", "Sign in")}</button>}
        {status === "authenticated" && <button disabled={Boolean(busy)} onClick={() => {
          setWarning("");
          void refreshAccess().then(allowed => {
            if (!allowed) setWarning(t("Dieses Konto ist noch nicht freigeschaltet.", "This account is still awaiting activation."));
          }).catch(() => setWarning(t("Freischaltung konnte gerade nicht geprüft werden.", "Activation could not be checked right now.")));
        }}>{t("Freischaltung prüfen", "Check activation")}</button>}
        <div className={styles.deliveryLinks}><a href={DONATE_URL} target="_blank" rel="noreferrer">{t("Projekt unterstützen", "Support the project")}</a>
          <Link href={en ? "/en/support" : "/in-eigener-sache"}>{t("Informationen zur Unterstützung", "Support information")}</Link></div>
      </>}
      {result && !sidechain && <ReleaseHandoff lang={lang} filename={result.name} file={result.file}/>}
      {result && <div className={styles.deliveryResult} data-reached={result.reached} role="status">
        <strong>{result.name}</strong>
        {result.reached && <p>{t("Zielpegel der Exportdatei erreicht", "Export file meets target level")}</p>}
        <div><span>LUFS-I <b>{result.loudness === null ? "—" : Number(result.loudness).toFixed(1)}</b></span>
          <span>True Peak <b>{result.peak === null ? "—" : Number(result.peak).toFixed(1) + " dBTP"}</b></span>
          {result.correction !== null && <span>{t("Pegelkorrektur", "Gain correction")} <b>{Number(result.correction).toFixed(1)} dB</b></span>}</div>
      </div>}
    </section>
    {warning && <p className={styles.deliveryWarning} role="alert">{warning}</p>}
    <AuthModal lang={lang} open={login} onClose={() => { setLogin(false); void refreshAccess().catch(() => {}); }}
      returnTo={`${en ? "/en" : ""}${sidechain ? "/tools/kick-bass-sidechain" : "/mastering-lab"}`} />
  </div>;
}
