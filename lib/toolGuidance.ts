import type { AnalysisData, Lang } from "@/lib/types/mastering";

type Text = Record<Lang, string>;
type Guide = { title: Text; situation: Text; action: Text; interpretation: Text; articles: string[]; next: string[] };
export const GUIDANCE_UPDATED = "2026-10-12";
export const TOOL_GUIDES: Record<string, Guide> = {
  "mix-check": {
    title: { de: "Mix-Check", en: "Mix Check" },
    situation: { de: "Dein Mix klingt fertig, aber du bist unsicher, ob er fürs Mastering geeignet ist.", en: "Your mix sounds finished, but you are unsure whether it is ready for mastering." },
    action: { de: "Prüfe den finalen Mix ohne zusätzlichen Lautmacher auf der Summe. Höre auffällige Stellen auch in Mono.", en: "Check the final mix without an extra loudness processor on the master bus. Audition flagged sections in mono too." },
    interpretation: { de: "Bei Clipping zuerst im Mix nacharbeiten. Ein guter technischer Score ersetzt keine Hörentscheidung.", en: "Fix clipping in the mix first. A good technical score cannot replace listening." },
    articles: ["mix-fuer-mastering-vorbereiten", "home-recording-fehler", "beatzucker-vs-andere-mastering-plattformen"], next: ["reference-comparison", "streaming-preview"],
  },
  "streaming-preview": {
    title: { de: "Streaming-Vorschau", en: "Streaming Preview" },
    situation: { de: "Dein lauter Master wirkt auf Streaming-Plattformen überraschend leise.", en: "Your loud master sounds unexpectedly quiet on streaming platforms." },
    action: { de: "Wähle die Plattform, höre Original und normalisierte Wiedergabe und erzeuge danach einen echten AAC- oder MP3-Vergleich.", en: "Choose a platform, compare original and normalized playback, then generate an actual AAC or MP3 comparison." },
    interpretation: { de: "Beispiel: −9 LUFS auf −14 LUFS bedeutet rechnerisch 5 dB Absenkung. Das ist keine Klangverschlechterung. Gemessene Codec-Spitzen helfen, die Reserve zu prüfen; Plattform-Presets bleiben Prognosen.", en: "Example: −9 LUFS to −14 LUFS means a calculated 5 dB reduction, not degraded sound. Measured codec peaks help check headroom; platform presets remain estimates." },
    articles: ["song-klingt-leise-spotify", "mastering-plattformen-lufs", "true-peak-rms-lufs"], next: ["mix-check", "audio-converter"],
  },
  "key-bpm": {
    title: { de: "Tonart & BPM", en: "Key & BPM" },
    situation: { de: "Ein Remix soll zum Tempo des Originals passen.", en: "A remix needs to match the original tempo." },
    action: { de: "Analysiere das Original und tippe beim Anhören das Tempo mit. Prüfe bei 70 BPM auch die angezeigte 140-BPM-Alternative.", en: "Analyze the original and tap along while listening. For a 70 BPM result, check the displayed 140 BPM alternative too." },
    interpretation: { de: "Half- und Double-Time können beide musikalisch passen. Eine nicht bestimmbare Tonart nicht als sichere Vorgabe für den Remix übernehmen.", en: "Half- and double-time may both be musically plausible. Do not treat an undetermined key as a reliable remix instruction." },
    articles: ["mix-fuer-mastering-vorbereiten", "was-ist-audio-mastering"], next: ["reference-comparison", "mix-check"],
  },
  "kick-bass-conflict": {
    title: { de: "Kick-/Bass-Check", en: "Kick/Bass Check" },
    situation: { de: "Die Kick verliert Druck, sobald der Bass einsetzt.", en: "The kick loses punch when the bass enters." },
    action: { de: "Exportiere beide Stems mit gleichem Startpunkt. Prüfe den markierten Bereich im kompletten Mix und teste in der DAW kürzere Bassnoten oder Sidechain.", en: "Export both stems from the same start point. Listen to the highlighted region in the full mix and try shorter bass notes or sidechain in your DAW." },
    interpretation: { de: "Ein hoher Überlagerungswert ist ein Prüfhinweis, kein automatischer EQ-Auftrag. Gewollte gemeinsame Energie darf bleiben.", en: "A high overlap score is a reason to listen, not an automatic EQ instruction. Intentional shared energy can stay." },
    articles: ["mix-fuer-mastering-vorbereiten", "home-recording-fehler", "mastering-vs-mixing"], next: ["mix-check", "reference-comparison"],
  },
  "reference-comparison": {
    title: { de: "Referenz-Vergleich", en: "Reference Comparison" },
    situation: { de: "Dein Mix klingt im Vergleich zu einem veröffentlichten Track dumpfer.", en: "Your mix sounds duller than a released reference." },
    action: { de: "Vergleiche bei angepasster Lautheit und höre ähnliche Songabschnitte. Prüfe danach Vocals und Becken im Mix statt sofort die ganzen Höhen anzuheben.", en: "Compare at matched loudness and listen to similar song sections. Check vocals and cymbals before boosting the entire high end." },
    interpretation: { de: "Ein höherer Spektralschwerpunkt kann auch vom Arrangement kommen. Die Zahlen sind Orientierung, keine Zielkurve zum Kopieren.", en: "A higher spectral centroid can reflect the arrangement. The numbers offer context, not a target curve to copy." },
    articles: ["mastering-vs-mixing", "mix-fuer-mastering-vorbereiten", "re-beatz-online-mastering-mit-kontrolle"], next: ["stereo-phase", "streaming-preview"],
  },
  "album-consistency": {
    title: { de: "Album-Check", en: "Album Check" },
    situation: { de: "Beim Durchhören deiner EP springt ein Song deutlich nach vorn.", en: "One track jumps out when you listen through your EP." },
    action: { de: "Prüfe die Tracks gemeinsam und höre Übergänge in der geplanten Reihenfolge. Vergleiche auffällige Songs anschließend direkt miteinander.", en: "Check the tracks together and audition transitions in running order. Then compare the outliers directly." },
    interpretation: { de: "Eine Ballade muss nicht so laut wie der Clubtrack sein. Der Median ist eine Vergleichshilfe; fehlende Analysen erst nachholen.", en: "A ballad need not be as loud as a club track. The median is a reference; complete any missing analyses first." },
    articles: ["lufs-erklaert", "mastering-plattformen-lufs", "was-ist-audio-mastering"], next: ["reference-comparison", "streaming-preview"],
  },
  "stereo-phase": {
    title: { de: "Stereo- & Phasenlabor", en: "Stereo & Phase Lab" },
    situation: { de: "Auf einer Mono-Box fehlt plötzlich der Bass.", en: "The bass disappears on a mono speaker." },
    action: { de: "Prüfe die Basskorrelation und schalte in der DAW auf Mono. Deaktiviere testweise Stereo-Verbreiterer auf Bass und Summe.", en: "Check low-band correlation and switch to mono in your DAW. Temporarily bypass bass and master-bus stereo wideners." },
    interpretation: { de: "Negative Korrelation kann auf Auslöschung hinweisen. Entscheidend ist, ob wichtige Elemente beim Mono-Hören verschwinden.", en: "Negative correlation can indicate cancellation. What matters is whether important elements disappear in mono." },
    articles: ["stereo-breite-mastering", "home-recording-fehler"], next: ["mix-check", "reference-comparison"],
  },
  "silence-normalizer": {
    title: { de: "Trimmer & Normalizer", en: "Trimmer & Normalizer" },
    situation: { de: "Eine Aufnahme hat lange stille Ränder und soll gleichmäßig laut ausgeliefert werden.", en: "A recording has long silent edges and needs a suitable delivery level." },
    action: { de: "Prüfe die Schnittpunkte per Vorhören; Ausklänge nicht abschneiden. Wähle dein LUFS-Ziel und lade die neu gemessene WAV herunter.", en: "Audition the trim points without cutting off tails. Choose a LUFS target and download the newly measured WAV." },
    interpretation: { de: "Bei knapper Peak-Reserve kann das Ergebnis leiser als das Ziel bleiben. Das Tool komprimiert nicht und ersetzt kein Mastering.", en: "Limited peak headroom may leave the result below target. This tool does not compress or replace mastering." },
    articles: ["lufs-erklaert", "true-peak-rms-lufs"], next: ["streaming-preview", "mix-check"],
  },
  "audio-converter": {
    title: { de: "WAV-Konverter", en: "WAV Converter" },
    situation: { de: "Ein Dienst verlangt 44,1 kHz und 16-Bit-WAV, dein Mix liegt in 24 Bit vor.", en: "A service needs 44.1 kHz, 16-bit WAV, but your mix is 24-bit." },
    action: { de: "Wähle die verlangte Rate und Bittiefe und aktiviere Dither für den finalen Integer-Export. Bewahre dein hochauflösendes Original.", en: "Select the required rate and depth, enabling dither for the final integer export. Keep your high-resolution original." },
    interpretation: { de: "Mehr kHz oder Bits stellen verlorene Qualität nicht wieder her. Prüfe die konvertierte Datei vor der Auslieferung.", en: "More kHz or bits cannot restore lost quality. Check the converted file before delivery." },
    articles: ["audioformate-vergleich", "sample-rate-bit-depth"], next: ["mix-check", "streaming-preview"],
  },
  "vocal-chain": {
    title: { de: "Vocal Chain", en: "Vocal Chain" },
    situation: { de: "Eine Gesangsspur hat scharfe S-Laute und wechselnden Pegel.", en: "A vocal has harsh sibilance and uneven levels." },
    action: { de: "Beginne mit einem zurückhaltenden Preset. Passe De-Esser und Kompression beim Hören an und vergleiche bei ähnlicher Lautheit.", en: "Start with a gentle preset. Adjust de-essing and compression while listening and compare at similar loudness." },
    interpretation: { de: "Zu viel De-Essing lässt die Stimme lispeln. Exportiere die Spur, füge sie in deinen Mix ein und prüfe anschließend den kompletten Mix – nicht nur das Solo-Vocal.", en: "Too much de-essing can make the voice lisp. Export the vocal, add it to your mix, then check the full mix, not just the solo vocal." },
    articles: ["home-recording-fehler", "mastering-vs-mixing"], next: ["mix-check", "reference-comparison"],
  },
};

export function toolHref(slug: string, lang: Lang) {
  return `${lang === "en" ? "/en" : ""}${slug === "mix-check" ? "/mix-check" : `/tools/${slug}`}`;
}

export function articleContentDate(article: { slug: string; publishedAt: string; updatedAt?: string }) {
  const original = article.updatedAt ?? article.publishedAt;
  return Object.values(TOOL_GUIDES).some(guide => guide.articles.includes(article.slug)) && original < GUIDANCE_UPDATED
    ? GUIDANCE_UPDATED : original;
}

export function nextStepGuidance(tool: string, lang: Lang, analysis?: AnalysisData | null) {
  const guide = TOOL_GUIDES[tool];
  if (!guide) return null;
  if (analysis?.clipping_detected) return {
    text: lang === "de" ? "Zuerst die Vollaussteuerung im Mix prüfen und gegebenenfalls neu exportieren. Lauter mastern repariert vorhandenes Clipping nicht." : "First inspect full-scale peaks in your mix and re-export if needed. Louder mastering cannot repair existing clipping.",
    tools: ["mix-check"].filter(slug => slug !== tool), article: "mix-fuer-mastering-vorbereiten",
  };
  if (analysis && analysis.mono_compatibility < 0.5) return {
    text: lang === "de" ? "Prüfe die auffällige Mono-Kompatibilität im Stereo-Labor und höre den Mix in Mono, bevor du weiter bearbeitest." : "Inspect the flagged mono compatibility in the Stereo Lab and listen in mono before further processing.",
    tools: ["stereo-phase"].filter(slug => slug !== tool), article: "stereo-breite-mastering",
  };
  if (analysis && analysis.true_peak > -1) return {
    text: lang === "de" ? "Prüfe die knappe Spitzenpegel-Reserve mit einer echten Codec-Vorschau. Bei Bedarf den Ausgangspegel im Mix oder Mastering senken." : "Check limited peak headroom with an actual codec preview. Reduce mix or mastering output level if needed.",
    tools: ["streaming-preview"].filter(slug => slug !== tool), article: "true-peak-rms-lufs",
  };
  return { text: guide.interpretation[lang], tools: guide.next, article: guide.articles[0] };
}
