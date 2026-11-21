"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@/lib/types/mastering";
import { responseError, toolError } from "@/lib/toolClient";
import { releaseCheckMaxBytes } from "@/lib/releaseTools";
import { receiveReleaseFile } from "@/lib/releaseHandoff";
import { useToolJob } from "@/lib/useToolJob";
import { downloadToolBlob, ToolError, ToolPanel } from "./ToolPanel";
import styles from "./release-tools.module.css";

type ReleaseReport = { integrated_lufs: number | null; true_peak: number | null; channels: number; codec: string;
  sample_rate: number; container: string; duration: number; bits: number | null; bit_rate: number | null };

export default function ReleaseCheck({ lang }: { lang: Lang }) {
  const en = lang === "en";
  const t = (de: string, english: string) => en ? english : de;
  const job = useToolJob();
  const [report, setReport] = useState<ReleaseReport>();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [target, setTarget] = useState(-14);
  const [ceiling, setCeiling] = useState(-1);
  const [handoff,setHandoff]=useState<File>();
  useEffect(()=>{const file=receiveReleaseFile("release-check");if(file)setHandoff(file);},[]);
  const rows = report ? [
    ["LUFS-I", report.integrated_lufs == null ? "—" : report.integrated_lufs.toFixed(1) + " LUFS"],
    ["True Peak", report.true_peak == null ? "—" : report.true_peak.toFixed(2) + " dBTP"],
    ["Codec", report.container.toUpperCase() + " · " + report.codec],
    [t("Kanäle", "Channels"), report.channels === 1 ? "Mono" : "Stereo"],
    ["Sample Rate", report.sample_rate / 1000 + " kHz"],
    [t("Dauer", "Duration"), report.duration.toFixed(2) + " s"],
    ...(report.bits ? [[t("Bittiefe", "Bit depth"), report.bits + " bit"]] : []),
    ...(report.bit_rate ? [[t("Bitrate", "Bit rate"), Math.round(report.bit_rate / 1000) + " kbps"]] : []),
  ] : [];
  const notes = report ? [
    report.integrated_lufs == null ? t("Kein messbares Lautheitssignal.", "No measurable loudness signal.")
      : Math.abs(report.integrated_lufs - target) <= 1 ? t("Lautheit liegt innerhalb von 1 LU zum gewählten Ziel.", "Loudness is within 1 LU of the chosen target.")
        : t("Abstand zum Ziel: ", "Difference from target: ") + (report.integrated_lufs - target).toFixed(1) + " LU",
    report.true_peak == null ? t("Kein messbarer True Peak.", "No measurable true peak.")
      : report.true_peak >= 0 ? t("True Peak erreicht oder überschreitet 0 dBTP. Auf Übersteuerungen prüfen.", "True peak reaches or exceeds 0 dBTP. Check for overs.")
        : report.true_peak > ceiling ? t("True Peak liegt über deiner gewählten Grenze.", "True peak exceeds your chosen ceiling.")
          : t("True Peak liegt innerhalb deiner gewählten Grenze.", "True peak is within your chosen ceiling."),
    ...(report.channels === 1 ? [t("Die Datei ist mono. Prüfe, ob das beabsichtigt ist.", "The file is mono. Check that this is intentional.")] : []),
  ] : [];
  async function inspect(file: File) {
    const task = job.start();
    setBusy(true); setReport(undefined); setName(file.name); setError("");
    try {
      if (!/\.(wav|mp3|aac|m4a)$/i.test(file.name)) throw Error(t("Bitte WAV, MP3, AAC oder AAC-in-M4A wählen.", "Choose WAV, MP3, AAC or AAC in M4A."));
      if (!file.size || file.size > releaseCheckMaxBytes) throw Error("RELEASE_SIZE");
      const format=file.name.split(".").pop()?.toLowerCase() ?? "";
      const res = await fetch("/api/release-check?format="+encodeURIComponent(format),
        { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: file, signal: task.signal });
      if (res.status===413) throw Error("RELEASE_SIZE");
      if (!res.ok) throw responseError(res);
      const data = (await res.json()).report as ReleaseReport;
      if (!Number.isFinite(data?.sample_rate) || typeof data.codec !== "string") throw Error("ANALYSIS");
      if (job.active(task)) setReport(data);
    } catch (reason) {
      if (job.active(task)) setError(reason instanceof Error && reason.message==="RELEASE_SIZE"
        ? t("Die Datei ist leer oder überschreitet 192 MiB.", "The file is empty or exceeds 192 MiB.")
        : reason instanceof Error && reason.message.includes("M4A") ? reason.message : toolError(reason, lang));
    } finally { if (job.active(task)) setBusy(false); }
  }
  return <ToolPanel>
    {handoff && <div className={styles.row}>
      <span>{handoff.name}</span><button data-action onClick={()=>{setHandoff(undefined);void inspect(handoff);}}>{t("Übergebenen Master messen","Measure transferred master")}</button>
    </div>}
    <label>{t("Fertige Datei auswählen", "Choose a finished file")}
      <input type="file" accept=".wav,.mp3,.aac,.m4a,audio/wav,audio/mpeg,audio/aac,audio/mp4" onChange={event => {
        const file = event.currentTarget.files?.[0]; if (file) {setHandoff(undefined);void inspect(file);}
      }} />
    </label>
    <p className={styles.hint}>{t("Bis 192 MiB und 10 Minuten. Die Datei wird zur Prüfung vorübergehend an Beatzucker gesendet.", "Up to 192 MiB and 10 minutes. The file is temporarily sent to Beatzucker for inspection.")}</p>
    <div className={styles.grid}>
      <label>{t("Lautheitsziel", "Loudness target")} <select value={target} onChange={e => setTarget(+e.target.value)}>{[-23,-16,-15,-14,-13,-12,-9,-8].map(value => <option key={value} value={value}>{value} LUFS</option>)}</select></label>
      <label>{t("Spitzengrenze", "Peak ceiling")} <select value={ceiling} onChange={e => setCeiling(+e.target.value)}>{[-3,-2,-1,-.5,0].map(value => <option key={value} value={value}>{value} dBTP</option>)}</select></label>
    </div>
    {busy && <div className={styles.row}><span role="status">{t("Datei wird gemessen …", "Measuring file…")}</span><button onClick={() => { job.cancel(); setBusy(false); }}>{t("Abbrechen","Cancel")}</button></div>}
    <ToolError>{error}</ToolError>
    {report && <section aria-label={t("Prüfbericht", "Inspection report")}>
      <h2>{name}</h2>
      <dl className={styles.metrics}>{rows.map(([key,value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
      <ul>{notes.map(note => <li key={note}>{note}</li>)}</ul>
      <button data-action onClick={() => downloadToolBlob(new Blob([[name, ...rows.map(row => row.join(" · ")), ...notes].join("\n")], { type: "text/plain;charset=utf-8" }), "beatzucker-release-check.txt")}>
        {t("Prüfbericht herunterladen", "Download inspection report")}
      </button>
    </section>}
  </ToolPanel>;
}
