import { NextRequest } from "next/server";

type Lang = "de" | "en";
type Scalar = number | string | boolean;

interface ReportPayload {
  filename: string; platform: string; preset: string; intensity: number; lang?: Lang;
  pre: Record<string, Scalar>; post: Record<string, Scalar> | null;
  notes: string; date: string; params?: Record<string, unknown>;
  manualOverrides?: Record<string, unknown>; selectedFormat?: string;
  availableFormats?: string[]; genre?: string; referenceUsed?: boolean; codecTrim?: string;
}

const FORMAT_LABELS: Record<string, string> = {
  wav32: "WAV 32-bit Float", wav24: "WAV 24-bit", wav16: "WAV 16-bit",
  flac: "FLAC 24-bit", mp3320: "MP3 320 kbps", mp3128: "MP3 128 kbps", aac256: "AAC 256 kbps",
};

const PARAMETER_GROUPS = [
  { de: "Ziel & Schutz", en: "Target & protection", items: [
    ["target_lufs", "Ziel-Lautheit", "Target loudness", "LUFS"],
    ["true_peak_ceiling", "True-Peak-Grenze", "True peak ceiling", "dBTP"],
    ["processing_intensity", "Verarbeitungsintensität", "Processing intensity", "%"],
  ]},
  { de: "Equalizer", en: "Equalizer", items: [
    ["highpass_freq", "Hochpass", "Highpass", "Hz"],
    ["low_shelf_gain", "Low Shelf · 80 Hz", "Low shelf · 80 Hz", "dB"],
    ["mid_notch_gain", "Mitten · 280 Hz", "Mids · 280 Hz", "dB"],
    ["presence_gain", "Präsenz · 3 kHz", "Presence · 3 kHz", "dB"],
    ["air_gain", "Luft · 12 kHz", "Air · 12 kHz", "dB"],
  ]},
  { de: "Multiband-Kompression", en: "Multiband compression", items: [
    ["mb_sub_threshold", "Sub-Schwelle", "Sub threshold", "dB"], ["mb_sub_ratio", "Sub-Ratio", "Sub ratio", ":1"],
    ["mb_low_threshold", "Bass-Schwelle", "Low threshold", "dB"], ["mb_low_ratio", "Bass-Ratio", "Low ratio", ":1"],
    ["mb_mid_threshold", "Mitten-Schwelle", "Mid threshold", "dB"], ["mb_mid_ratio", "Mitten-Ratio", "Mid ratio", ":1"],
    ["mb_high_threshold", "Höhen-Schwelle", "High threshold", "dB"], ["mb_high_ratio", "Höhen-Ratio", "High ratio", ":1"],
  ]},
  { de: "Stereo, Farbe & Bus", en: "Stereo, color & bus", items: [
    ["stereo_width", "Stereobreite", "Stereo width", "×"],
    ["saturation_amount", "Sättigung", "Saturation", "Drive"],
    ["bus_comp_threshold", "Bus-Comp-Schwelle", "Bus comp threshold", "dB"],
    ["bus_comp_ratio", "Bus-Comp-Ratio", "Bus comp ratio", ":1"],
  ]},
] as const;

const DSP_STAGES = [
  ["DC-Offset entfernen", "DC offset removal"], ["Gain-Staging", "Gain staging"],
  ["Korrektur-EQ", "Correction EQ"], ["De-Esser", "De-esser"],
  ["Multiband-Kompression", "Multiband compression"], ["M/S-Bearbeitung", "M/S processing"],
  ["Sättigung", "Saturation"], ["Final-EQ", "Final EQ"],
  ["Bus-Kompression", "Bus compression"], ["True-Peak-Limiter", "True peak limiter"],
  ["Dithering & Export", "Dithering & export"], ["Codec-Verifikation", "Codec verification"],
] as const;

function esc(value: unknown): string {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}
function finite(value: unknown): number | null { const result = Number(value); return Number.isFinite(result) ? result : null; }
function number(value: unknown, decimals = 1, locale = "de-DE"): string {
  const result = finite(value); return result === null ? "—" : result.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("data");
  if (!raw) return Response.json({ error: "data required" }, { status: 400 });
  let payload: ReportPayload;
  try { payload = JSON.parse(Buffer.from(raw, "base64").toString("utf-8")) as ReportPayload; }
  catch { return Response.json({ error: "invalid data" }, { status: 400 }); }

  const lang: Lang = payload.lang === "en" ? "en" : "de";
  const locale = lang === "de" ? "de-DE" : "en-GB";
  const t = <T,>(de: T, en: T) => lang === "de" ? de : en;
  const pre = payload.pre && typeof payload.pre === "object" ? payload.pre : {};
  const post = payload.post && typeof payload.post === "object" ? payload.post : null;
  const params = payload.params && typeof payload.params === "object" ? payload.params : {};
  const manual = payload.manualOverrides && typeof payload.manualOverrides === "object" ? payload.manualOverrides : {};
  const manualKeys = new Set(Object.keys(manual));
  const filename = esc(payload.filename || t("Unbenannter Track", "Untitled track"));
  const selectedFormat = FORMAT_LABELS[payload.selectedFormat || ""] || payload.selectedFormat || "—";
  const availableFormats = Array.isArray(payload.availableFormats) ? payload.availableFormats.map((format) => FORMAT_LABELS[format] || format).filter(Boolean) : [];
  const yesNo = (value: unknown) => value ? t("Ja", "Yes") : t("Nein", "No");
  const metric = (value: unknown, suffix: string, decimals = 1) => `${number(value, decimals, locale)}${suffix ? ` ${suffix}` : ""}`;
  const signed = (value: unknown, suffix: string, decimals = 1) => { const result = finite(value); return result === null ? "—" : `${result > 0 ? "+" : ""}${number(result, decimals, locale)} ${suffix}`; };
  const formatParam = (key: string, value: unknown, unit: string) => {
    if (typeof value === "string") return esc(value);
    if (key === "processing_intensity") return metric(value, "%", 0);
    if (unit === "Hz") return metric(value, "Hz", 0);
    if (unit === "dB" || unit === "dBTP") return signed(value, unit, 1);
    if (unit === ":1") return `${number(value, 2, locale)} : 1`;
    if (unit === "×") return `${number(value, 2, locale)}×`;
    return number(value, 2, locale);
  };
  const comparisonRow = (label: string, before: string, after: string, warn = false) => `<tr><td>${label}</td><td class="mono">${before}</td><td class="mono ${warn ? "warn" : before !== after ? "changed" : ""}">${after}</td></tr>`;
  const parameterHtml = PARAMETER_GROUPS.map((group) => {
    const rows = group.items.flatMap(([key, de, en, unit]) => !(key in params) ? [] : [`<tr class="${manualKeys.has(key) ? "manual-row" : ""}"><td>${t(de, en)}${manualKeys.has(key) ? `<span class="manual-badge">${t("MANUELL", "MANUAL")}</span>` : ""}</td><td class="mono">${formatParam(key, params[key], unit)}</td></tr>`]).join("");
    return rows ? `<div class="parameter-group"><h3>${t(group.de, group.en)}</h3><table><tbody>${rows}</tbody></table></div>` : "";
  }).join("");

  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${t("Mastering-Bericht", "Mastering report")} — ${filename}</title><style>
  :root{--ink:#151827;--muted:#687086;--line:#dfe3ec;--purple:#7657e8;--cyan:#169bd5;--green:#168b62;--paper:#fff;--soft:#f5f7fb}*{box-sizing:border-box}body{margin:0;background:#0a0c16;color:var(--ink);font-family:Inter,Segoe UI,Arial,sans-serif;line-height:1.45}.page{width:min(920px,calc(100% - 32px));margin:32px auto;padding:42px 46px;background:var(--paper);border-radius:18px;box-shadow:0 30px 90px rgba(0,0,0,.35)}.print{position:fixed;top:20px;right:20px;border:0;border-radius:999px;padding:11px 18px;color:#fff;background:linear-gradient(100deg,var(--cyan),var(--purple));font-weight:700;cursor:pointer;box-shadow:0 8px 24px rgba(118,87,232,.3)}header{display:flex;justify-content:space-between;gap:24px;padding-bottom:24px;border-bottom:2px solid var(--ink)}.brand{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:800;letter-spacing:.04em}.mark{display:inline-flex;align-items:flex-end;gap:2px;height:20px}.mark i{width:3px;border-radius:4px;background:linear-gradient(var(--purple),var(--cyan))}.mark i:nth-child(1),.mark i:nth-child(5){height:9px}.mark i:nth-child(2),.mark i:nth-child(4){height:15px}.mark i:nth-child(3){height:20px}h1{margin:15px 0 3px;font-size:29px;line-height:1.1;letter-spacing:-.035em}.filename{color:var(--cyan);overflow-wrap:anywhere}.date{color:var(--muted);font-size:12px}.status{align-self:flex-start;padding:7px 11px;border:1px solid #b9ead7;border-radius:999px;color:var(--green);background:#effbf6;font-size:11px;font-weight:800;white-space:nowrap}.meta-grid,.kpis,.quality-grid{display:grid;gap:10px}.meta-grid{grid-template-columns:repeat(4,1fr);margin:22px 0}.meta,.kpi,.quality{padding:13px 14px;border:1px solid var(--line);border-radius:11px;background:var(--soft)}.label,.section-title{color:var(--muted);font-size:9px;font-weight:800;letter-spacing:.11em;text-transform:uppercase}.meta strong,.quality strong{display:block;margin-top:4px;font-size:13px}.summary{margin:0 0 25px;padding:15px 17px;border-left:3px solid var(--purple);border-radius:0 10px 10px 0;background:#f7f4ff;color:#37334c;font-size:13px}section{margin-top:27px;break-inside:avoid}.section-title{display:flex;align-items:center;gap:9px;margin-bottom:11px;color:var(--purple)}.section-title:after{content:"";height:1px;flex:1;background:var(--line)}.kpis{grid-template-columns:repeat(4,1fr)}.kpi strong{display:block;margin-top:5px;font:800 19px/1.1 ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--cyan)}.kpi small{color:var(--muted);font-size:10px}table{width:100%;border-collapse:collapse;font-size:12px}th{padding:7px 9px;text-align:left;color:var(--muted);background:var(--soft);font-size:9px;letter-spacing:.08em;text-transform:uppercase}td{padding:7px 9px;border-bottom:1px solid #edf0f5}.mono{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.changed{color:var(--purple);font-weight:800}.warn{color:#c33;font-weight:800}.chain{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;counter-reset:stage}.stage{counter-increment:stage;padding:9px;border:1px solid var(--line);border-radius:9px;background:var(--soft);font-size:10px;font-weight:700}.stage:before{content:counter(stage,decimal-leading-zero);display:block;margin-bottom:3px;color:var(--purple);font:800 9px ui-monospace,SFMono-Regular,Consolas,monospace}.parameters{display:grid;grid-template-columns:1fr 1fr;gap:12px}.parameter-group{border:1px solid var(--line);border-radius:10px;overflow:hidden;break-inside:avoid}.parameter-group h3{margin:0;padding:9px 11px;color:#41475a;background:var(--soft);font-size:11px}.parameter-group td:last-child{text-align:right}.manual-row{background:#f5fbff}.manual-row td:first-child{color:#096f9b;font-weight:700}.manual-badge{margin-left:7px;padding:2px 5px;border-radius:4px;color:#fff;background:var(--cyan);font-size:7px;letter-spacing:.05em}.quality-grid{grid-template-columns:repeat(3,1fr)}.formats{margin-top:10px;color:var(--muted);font-size:10px}footer{margin-top:34px;padding-top:15px;border-top:1px solid var(--line);display:flex;justify-content:space-between;color:#9298a8;font-size:9px}@page{size:A4;margin:12mm}@media print{body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{width:100%;margin:0;padding:0;box-shadow:none;border-radius:0}.print{display:none}}@media(max-width:700px){.page{padding:28px 22px}.meta-grid,.kpis{grid-template-columns:1fr 1fr}.parameters,.quality-grid{grid-template-columns:1fr}.chain{grid-template-columns:1fr 1fr}}
  </style></head><body><button class="print" onclick="window.print()">${t("Als PDF speichern", "Save as PDF")}</button><main class="page">
  <header><div><div class="brand"><span class="mark"><i></i><i></i><i></i><i></i><i></i></span> BEATZUCKER · ${t("MASTERING-BERICHT", "MASTERING REPORT")}</div><h1>${t("Master für", "Master for")} <span class="filename">${filename}</span></h1><div class="date">${esc(payload.date)}</div></div><div class="status">● ${t("MASTER ABGESCHLOSSEN", "MASTER COMPLETE")}</div></header>
  <div class="meta-grid"><div class="meta"><span class="label">${t("Plattform", "Platform")}</span><strong>${esc(payload.platform).toUpperCase()}</strong></div><div class="meta"><span class="label">Preset</span><strong>${esc(payload.preset).toUpperCase()}</strong></div><div class="meta"><span class="label">${t("Intensität", "Intensity")}</span><strong>${number(payload.intensity,0,locale)} %</strong></div><div class="meta"><span class="label">${t("Ausgabe", "Output")}</span><strong>${esc(selectedFormat)}</strong></div></div>
  <p class="summary">${esc(payload.notes || t("Keine Zusammenfassung verfügbar.", "No summary available."))}</p>
  <section><div class="section-title">${t("Master-Ergebnis", "Master result")}</div><div class="kpis"><div class="kpi"><span class="label">LUFS</span><strong>${metric(post?.integrated_lufs,"",1)}</strong><small>${t("Original", "Original")}: ${metric(pre.integrated_lufs,"",1)}</small></div><div class="kpi"><span class="label">TRUE PEAK</span><strong>${metric(post?.true_peak,"dBTP",1)}</strong><small>${t("Grenze", "Ceiling")}: ${metric(params.true_peak_ceiling,"dBTP",1)}</small></div><div class="kpi"><span class="label">DYNAMIC RANGE</span><strong>DR${number(post?.dr_value,0,locale)}</strong><small>${t("Original", "Original")}: DR${number(pre.dr_value,0,locale)}</small></div><div class="kpi"><span class="label">STEREO</span><strong>${number((finite(post?.stereo_width)??0)*100,0,locale)} %</strong><small>${t("Mono-Kompatibilität", "Mono compatibility")}: ${number(post?.mono_compatibility,2,locale)}</small></div></div></section>
  <section><div class="section-title">${t("Vorher-/Nachher-Messung", "Before/after measurement")}</div><table><thead><tr><th>${t("Messwert", "Metric")}</th><th>${t("Original", "Original")}</th><th>${t("Master", "Master")}</th></tr></thead><tbody>${comparisonRow("Integrated LUFS",metric(pre.integrated_lufs,"LUFS"),metric(post?.integrated_lufs,"LUFS"))}${comparisonRow("True Peak",metric(pre.true_peak,"dBTP"),metric(post?.true_peak,"dBTP"))}${comparisonRow("Dynamic Range",`DR${number(pre.dr_value,0,locale)}`,`DR${number(post?.dr_value,0,locale)}`)}${comparisonRow("Crest Factor",metric(pre.crest_factor,"dB"),metric(post?.crest_factor,"dB"))}${comparisonRow("Loudness Range",metric(pre.lra,"LU"),metric(post?.lra,"LU"))}${comparisonRow(t("Mono-Kompatibilität","Mono compatibility"),number(pre.mono_compatibility,2,locale),number(post?.mono_compatibility,2,locale))}${comparisonRow("Clipping",yesNo(pre.clipping_detected),yesNo(post?.clipping_detected),Boolean(post?.clipping_detected))}</tbody></table></section>
  <section><div class="section-title">${t("Tatsächlich verwendete DSP-Kette", "DSP chain actually used")}</div><div class="chain">${DSP_STAGES.map(([de,en])=>`<div class="stage">${t(de,en)}</div>`).join("")}</div></section>
  ${parameterHtml?`<section><div class="section-title">${t("Adaptive & manuelle Parameter", "Adaptive & manual parameters")}</div><div class="parameters">${parameterHtml}</div></section>`:""}
  <section><div class="section-title">${t("Spektrum & Frequenzenergie", "Spectrum & frequency energy")}</div><table><thead><tr><th>${t("Messwert", "Metric")}</th><th>${t("Original", "Original")}</th><th>${t("Master", "Master")}</th></tr></thead><tbody>${comparisonRow(t("Spektraler Schwerpunkt","Spectral centroid"),metric((finite(pre.spectral_centroid)??0)/1000,"kHz"),metric((finite(post?.spectral_centroid)??0)/1000,"kHz"))}${comparisonRow(t("Spektraler Rolloff","Spectral rolloff"),metric((finite(pre.spectral_rolloff)??0)/1000,"kHz"),metric((finite(post?.spectral_rolloff)??0)/1000,"kHz"))}${comparisonRow("Sub · 20–80 Hz",metric(pre.rms_sub,"dB"),metric(post?.rms_sub,"dB"))}${comparisonRow(t("Bass · 80–500 Hz","Low · 80–500 Hz"),metric(pre.rms_low,"dB"),metric(post?.rms_low,"dB"))}${comparisonRow(t("Mitten · 500 Hz–5 kHz","Mid · 500 Hz–5 kHz"),metric(pre.rms_mid,"dB"),metric(post?.rms_mid,"dB"))}${comparisonRow(t("Höhen · 5–12 kHz","High · 5–12 kHz"),metric(pre.rms_high,"dB"),metric(post?.rms_high,"dB"))}${comparisonRow(t("Luft · 12–20 kHz","Air · 12–20 kHz"),metric(pre.rms_air,"dB"),metric(post?.rms_air,"dB"))}</tbody></table></section>
  <section><div class="section-title">${t("Export & Qualitätsprüfung", "Export & quality verification")}</div><div class="quality-grid"><div class="quality"><span class="label">${t("Quelle", "Source")}</span><strong>${number(pre.sample_rate,0,locale)} Hz · ${number(pre.bit_depth,0,locale)} Bit · ${Number(pre.channels)===2?"Stereo":"Mono"}</strong></div><div class="quality"><span class="label">${t("Referenz-Matching", "Reference matching")}</span><strong>${payload.referenceUsed?t("Verwendet","Used"):t("Nicht verwendet","Not used")}</strong></div><div class="quality"><span class="label">${t("Codec-Sicherheitsabsenkung", "Codec safety trim")}</span><strong>${payload.codecTrim?`${esc(payload.codecTrim)} dB`:t("Nicht erforderlich","Not required")}</strong></div></div><div class="formats">${t("Erzeugte Dateien", "Rendered files")}: ${availableFormats.length?availableFormats.map(esc).join(" · "):esc(selectedFormat)}</div></section>
  <section><div class="section-title">${t("Track-Informationen", "Track information")}</div><table><tbody><tr><td>BPM</td><td class="mono">${number(pre.bpm,0,locale)}</td><td>${t("Tonart","Key")}</td><td class="mono">${esc(pre.key)}</td></tr><tr><td>${t("Dauer","Duration")}</td><td class="mono">${Math.floor((finite(pre.duration_seconds)??0)/60)}:${String(Math.floor((finite(pre.duration_seconds)??0)%60)).padStart(2,"0")}</td><td>${t("Stil","Style")}</td><td class="mono">${esc(payload.genre||params.genre||payload.preset)}</td></tr></tbody></table></section>
  <footer><span>Beatzucker · Adaptives Audio-Mastering</span><span>${t("Erstellt", "Created")}: ${esc(payload.date)}</span></footer></main></body></html>`;
  return new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"private, no-store","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; frame-ancestors 'none'"}});
}
