import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/report?data=<base64-json>
 * Returns a printable HTML mastering report page.
 * The client calls window.open(url) then window.print() for PDF export.
 */
/** Escape all HTML special characters to prevent XSS. */
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("data");
  if (!raw) return NextResponse.json({ error: "data required" }, { status: 400 });

  let payload: {
    filename: string;
    platform: string;
    preset: string;
    intensity: number;
    pre:  Record<string, number | string | boolean>;
    post: Record<string, number | string | boolean> | null;
    notes: string;
    date: string;
  };

  try {
    payload = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
  } catch {
    return NextResponse.json({ error: "invalid data" }, { status: 400 });
  }

  // Escape all user-supplied string fields before HTML injection
  const filename  = esc(payload.filename);
  const platform  = esc(payload.platform);
  const preset    = esc(payload.preset);
  const intensity = Number(payload.intensity) || 0;
  const notes     = esc(payload.notes);
  const date      = esc(payload.date);
  const pre       = payload.pre  ?? {};
  const post      = payload.post ?? null;

  const row = (label: string, preVal: string, postVal?: string) => `
    <tr>
      <td>${label}</td>
      <td class="num">${preVal}</td>
      ${post ? `<td class="num ${postVal && postVal !== preVal ? "improved" : ""}">${postVal ?? "—"}</td>` : ""}
    </tr>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Mastering Report — ${filename}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Inter, system-ui, sans-serif; background: #080a0f; color: #e8eaf2; padding: 40px; max-width: 900px; margin: 0 auto; }
    @media print { body { background: #fff; color: #000; padding: 0; } .no-print { display: none; } }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
    h1 span.brand { color: #7c6fff; }
    h1 span.track { color: #00e5c4; }
    .meta { font-size: 13px; color: #6b7280; margin-bottom: 32px; font-family: 'JetBrains Mono', monospace; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 11px; font-weight: 600; letter-spacing: 0.12em; color: #7c6fff; text-transform: uppercase; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid rgba(124,111,255,0.2); }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; color: #6b7280; text-transform: uppercase; padding: 4px 8px; }
    td { padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,0.04); }
    td.num { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #00e5c4; }
    td.improved { color: #4ade80; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .badge-platform { background: rgba(0,229,196,0.12); color: #00e5c4; border: 1px solid rgba(0,229,196,0.3); }
    .badge-preset   { background: rgba(124,111,255,0.12); color: #7c6fff; border: 1px solid rgba(124,111,255,0.3); }
    .notes-box { background: rgba(124,111,255,0.06); border: 1px solid rgba(124,111,255,0.2); border-radius: 8px; padding: 14px 16px; font-size: 13px; line-height: 1.6; color: #d1d5db; }
    .print-btn { position: fixed; top: 20px; right: 20px; background: #7c6fff; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .print-btn:hover { background: #9b8fff; }
    .clip-warn { color: #ff4757; font-weight: 600; }
    .footer { margin-top: 40px; font-size: 11px; color: #374151; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px; }
  </style>
</head>
<body>
  <button class="no-print print-btn" onclick="window.print()">⬇ Save as PDF</button>

  <div class="section">
    <h1><span class="brand">Beatzucker</span> · <span class="track">${filename}</span></h1>
    <p class="meta">${date} &nbsp;·&nbsp; Platform: <span class="badge badge-platform">${platform.toUpperCase()}</span>
    &nbsp;·&nbsp; Preset: <span class="badge badge-preset">${preset.toUpperCase()}</span>
    &nbsp;·&nbsp; Intensity: ${intensity}%</p>
  </div>

  <div class="section">
    <div class="section-title">AI Mastering Notes</div>
    <div class="notes-box">${notes || "No notes available."}</div>
  </div>

  <div class="section">
    <div class="section-title">Loudness &amp; Dynamics</div>
    <table>
      <thead><tr>
        <th>Parameter</th><th>Original</th>${post ? "<th>Master</th>" : ""}
      </tr></thead>
      <tbody>
        ${row("Integrated LUFS", `${Number(pre.integrated_lufs).toFixed(1)} LUFS`, post ? `${Number(post.integrated_lufs).toFixed(1)} LUFS` : undefined)}
        ${row("True Peak", `${Number(pre.true_peak).toFixed(1)} dBTP`, post ? `${Number(post.true_peak).toFixed(1)} dBTP` : undefined)}
        ${row("Dynamic Range", `DR${Number(pre.dr_value).toFixed(0)}`, post ? `DR${Number(post.dr_value).toFixed(0)}` : undefined)}
        ${row("Crest Factor", `${Number(pre.crest_factor).toFixed(1)} dB`, post ? `${Number(post.crest_factor).toFixed(1)} dB` : undefined)}
        ${row("Clipping", pre.clipping_detected ? '<span class="clip-warn">Detected</span>' : "None", post ? (post.clipping_detected ? '<span class="clip-warn">Detected</span>' : "None") : undefined)}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Spectral Analysis</div>
    <table>
      <thead><tr><th>Parameter</th><th>Original</th>${post ? "<th>Master</th>" : ""}</tr></thead>
      <tbody>
        ${row("Spectral Centroid", `${(Number(pre.spectral_centroid) / 1000).toFixed(1)} kHz`, post ? `${(Number(post.spectral_centroid) / 1000).toFixed(1)} kHz` : undefined)}
        ${row("Spectral Rolloff",  `${(Number(pre.spectral_rolloff)  / 1000).toFixed(1)} kHz`, post ? `${(Number(post.spectral_rolloff) / 1000).toFixed(1)} kHz` : undefined)}
        ${row("Spectral Flatness", `${(Number(pre.spectral_flatness) * 100).toFixed(1)} %`, post ? `${(Number(post.spectral_flatness) * 100).toFixed(1)} %` : undefined)}
        ${row("Stereo Width",      `${(Number(pre.stereo_width) * 100).toFixed(0)} %`, post ? `${(Number(post.stereo_width) * 100).toFixed(0)} %` : undefined)}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Frequency Band Energy (RMS dB)</div>
    <table>
      <thead><tr><th>Band</th><th>Original</th>${post ? "<th>Master</th>" : ""}</tr></thead>
      <tbody>
        ${row("Sub (20–80 Hz)",   `${Number(pre.rms_sub).toFixed(1)}`,  post ? `${Number(post.rms_sub).toFixed(1)}`  : undefined)}
        ${row("Low (80–300 Hz)",  `${Number(pre.rms_low).toFixed(1)}`,  post ? `${Number(post.rms_low).toFixed(1)}`  : undefined)}
        ${row("Mid (300–3k Hz)",  `${Number(pre.rms_mid).toFixed(1)}`,  post ? `${Number(post.rms_mid).toFixed(1)}`  : undefined)}
        ${row("High (3k–10k Hz)", `${Number(pre.rms_high).toFixed(1)}`, post ? `${Number(post.rms_high).toFixed(1)}` : undefined)}
        ${row("Air (10k–20k Hz)", `${Number(pre.rms_air).toFixed(1)}`,  post ? `${Number(post.rms_air).toFixed(1)}`  : undefined)}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Track Info</div>
    <table>
      <thead><tr><th>Property</th><th>Value</th></tr></thead>
      <tbody>
        <tr><td>BPM</td><td class="num">${Number(pre.bpm).toFixed(0)}</td></tr>
        <tr><td>Key</td><td class="num">${esc(pre.key)}</td></tr>
        <tr><td>Sample Rate</td><td class="num">${(Number(pre.sample_rate) / 1000).toFixed(1)} kHz</td></tr>
        <tr><td>Channels</td><td class="num">${Number(pre.channels) === 2 ? "Stereo" : "Mono"}</td></tr>
        <tr><td>Duration</td><td class="num">${Math.floor(Number(pre.duration_seconds) / 60)}:${String(Math.floor(Number(pre.duration_seconds) % 60)).padStart(2, "0")}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    Generated by Beatzucker · beatzucker.de · ${date}
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
