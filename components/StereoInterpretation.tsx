import Link from "next/link";
import type { Lang } from "@/lib/types/mastering";
import type { StereoResult } from "@/lib/workerAnalysis";
import { stereoAdvice } from "@/lib/stereoGuidance";

export default function StereoInterpretation({ lang, result }: { lang: Lang; result?: StereoResult | null }) {
  const en = lang === "en";
  const base = en ? "/en/knowledge/" : "/ressourcen/";
  return <section className="tool-practice" aria-labelledby="stereo-interpretation-title">
    <span className="tool-section-label">{en ? "READ THE MEASUREMENT · CHOOSE YOUR NEXT STEP" : "MESSUNG VERSTEHEN · NÄCHSTEN SCHRITT WÄHLEN"}</span>
    <h2 id="stereo-interpretation-title">{result ? (en ? "What should I check in this track?" : "Was sollte ich bei diesem Track prüfen?") : (en ? "What do the stereo readings mean?" : "Was bedeuten die Stereo-Messwerte?")}</h2>
    {result && <div className="tool-seo-columns">{stereoAdvice(result, lang).map(advice => <article key={advice.id}><h3>{advice.title}</h3><p>{advice.text}</p></article>)}</div>}
    <p>{en ? "The analyzer measures the whole decoded file, not live playback. Averages can hide a brief problem in a chorus. It does not repair or export your audio. There is no mono playback switch here: use your DAW for that listening check." : "Der Analyzer misst die gesamte dekodierte Datei, nicht die laufende Wiedergabe. Mittelwerte können ein kurzes Problem im Refrain verdecken. Er repariert oder exportiert dein Audio nicht. Eine Mono-Abhörumschaltung gibt es hier nicht: Nutze dafür deine DAW."}</p>
    <details open={!result}><summary>{en ? "Correlation, width and mono level — explained" : "Korrelation, Breite und Mono-Pegel – erklärt"}</summary><ul>
      <li>{en ? "Correlation: +1 means aligned channel content, near 0 means little correlation, −1 means opposing content. None is a universal quality target. Missing band energy is shown as —, not a pass." : "Korrelation: +1 steht für gleichläufige Kanalinhalte, nahe 0 für geringe Korrelation, −1 für gegenläufige Inhalte. Kein Wert ist ein universelles Qualitätsziel. Fehlende Bandenergie erscheint als —, nicht als bestandener Test."}</li>
      <li>{en ? "Side/mid: 0× means no side content; 1× means equal side and mid energy. This is not a width percentage. When the mid signal disappears, the ratio is undefined." : "Side/Mid: 0× bedeutet kein Seitensignal; 1× bedeutet gleiche Side- und Mid-Energie. Das ist keine Breite in Prozent. Verschwindet das Mittensignal, ist das Verhältnis nicht bestimmbar."}</li>
      <li>{en ? "Mono level compares (L + R) / 2 against stereo RMS. Identical channels give 0 dB; uncorrelated channels of equal energy give roughly −3 dB. That alone is not a phase fault or a LUFS measurement." : "Der Mono-Pegel vergleicht (L + R) / 2 mit dem Stereo-RMS. Identische Kanäle ergeben 0 dB; unkorrelierte Kanäle gleicher Energie ungefähr −3 dB. Das allein ist kein Phasenfehler und keine LUFS-Messung."}</li>
      <li>{en ? "L/R balance shows average energy differences, not whether a voice is centred. A mono file has no independent stereo width information." : "L/R-Balance zeigt mittlere Energieunterschiede, nicht ob eine Stimme mittig steht. Eine Mono-Datei enthält keine unabhängige Information über Stereobreite."}</li>
    </ul></details>
    <div className="tool-guidance-links"><Link href={`${base}stereo-breite-mastering`}>{en ? "Understand stereo width" : "Stereobreite verstehen"}</Link><Link href={en ? "/en/tools/reference-comparison" : "/tools/reference-comparison"}>{en ? "Compare a reference" : "Referenz vergleichen"}</Link><Link href={en ? "/en/mix-check" : "/mix-check"}>{en ? "Check the mix as a whole" : "Mix insgesamt prüfen"}</Link></div>
  </section>;
}
