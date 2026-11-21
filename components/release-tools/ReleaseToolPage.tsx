import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ToolLanguageNav from "@/components/ToolLanguageNav";
import { AUDIO_RELEASE_TOOLS, releaseToolHref, type AudioReleaseTool } from "@/lib/releaseTools";
import { pageMetadata } from "@/lib/pageMetadata";
import type { Lang } from "@/lib/types/mastering";
import ReleaseCheck from "./ReleaseCheck";
import MasteringBlindTest from "./MasteringBlindTest";
import DjLoopEditor from "./DjLoopEditor";
import AudioVisualizer from "./AudioVisualizer";
import styles from "./release-tools.module.css";

const bodies = {
  "release-check": {
    de: ["Prüfe die Datei, die du tatsächlich auslieferst", "Lade die finale Datei nach dem Codieren. Wähle dein Ziel und lies die Abweichung in LU und den gemessenen True Peak ab. Schlägt der Prüfbericht an, exportiere mit mehr Reserve und prüfe die neue Datei erneut.", "Das Tool misst die vorhandene Datei. Für eine Vorschau auf Plattform-Normalisierung und einen geplanten Codec nutze die Streaming-Vorschau.", "/tools/streaming-preview", "Streaming-Vorschau"],
    en: ["Check the file you actually deliver", "Load the final encoded file. Choose your target and compare the difference in LU and the measured true peak. If the report flags peaks, export with more headroom and check the new file.", "The tool measures the existing file. For predicted platform normalization and a planned codec, use Streaming Preview.", "/en/tools/streaming-preview", "Streaming Preview"],
  },
  "mastering-blindtest": {
    de: ["Zwei Master bei gleicher Lautheit vergleichen", "Lade zwei Exporte desselben Mixes mit gleichem Startpunkt. Wechsle während der Wiedergabe zwischen A und B und achte auf Transienten, Stimme und Tiefton. Die Zuordnung und Dateinamen erscheinen nach deiner Wahl.", "Die Position bleibt beim Umschalten erhalten. Unterschiedliche Intros oder Stille am Dateianfang solltest du vorher ausgleichen.", "/tools/audio-cutter", "Startpunkt im Audio-Cutter setzen"],
    en: ["Compare two masters at the same loudness", "Load two exports of the same mix with matching start points. Switch between A and B while listening for transients, vocals and the low end. File names and the assignment appear after your vote.", "Switching preserves the playback position. Align different intros or leading silence before comparing.", "/en/tools/audio-cutter", "Align starts in Audio Cutter"],
  },
  "dj-loop-editor": {
    de: ["Vom Downbeat zum fertigen DJ-Loop", "Setze den Start auf den ersten Schlag, tippe das Tempo oder gib die BPM ein und wähle die Taktzahl. Bei 120 BPM dauert ein 4-Takt-Loop im Vierertakt genau 8 Sekunden. Höre den Übergang vor dem WAV-Export.", "Für eine verlängerte DJ-Version wiederholt der Editor die gewählte Passage im vollständigen Track. Eine Passage am Anfang oder Ende eignet sich für ein längeres Intro oder Outro.", "/tools/key-bpm", "BPM zuerst ermitteln"],
    en: ["From downbeat to a finished DJ loop", "Place the start on the first beat, tap or enter the tempo and choose a bar count. At 120 BPM, four bars in 4/4 last exactly eight seconds. Audition the seam before exporting WAV.", "For an extended DJ edit, the editor repeats the selected passage within the full track. Select a passage near either end to extend the intro or outro.", "/en/tools/key-bpm", "Find BPM first"],
  },
  "audio-visualizer": {
    de: ["Cover und Wellenform als Hochkantvideo", "Wähle bis zu 30 Sekunden und ein Cover. Gib einen kurzen Titel ein. Wenn du zusätzlich einen zeitlich passenden Master lädst, zeigt das Video in der zweiten Hälfte die bearbeitete Version mit sichtbarer A/B-Markierung.", "Die Aufnahme läuft im Browser mit Ton und 720 × 1280 Pixeln. Der Browser bestimmt, ob MP4 oder WebM ausgegeben wird.", "/hoervergleich", "Beatzucker-Hörvergleich ansehen"],
    en: ["Turn cover art and a waveform into a vertical video", "Choose up to 30 seconds and add cover art. Set a short title. If you add a time-aligned master, the second half plays the processed version and labels the A/B switch.", "The browser records sound with a 720 × 1280 canvas. Your browser determines whether the video is MP4 or WebM.", "/en/mastering-examples", "Hear Beatzucker mastering examples"],
  },
} as const;
const tools = {
  "release-check": ReleaseCheck,
  "mastering-blindtest": MasteringBlindTest,
  "dj-loop-editor": DjLoopEditor,
  "audio-visualizer": AudioVisualizer,
};

export function releaseToolMetadata(tool: AudioReleaseTool, lang: Lang) {
  const copy=AUDIO_RELEASE_TOOLS[tool][lang], base="https://beatzucker.de";
  const de=base+releaseToolHref(tool,"de"), en=base+releaseToolHref(tool,"en");
  return pageMetadata({ title:{absolute:copy.title+" | Beatzucker"},description:copy.summary,
    alternates:{canonical:lang==="en"?en:de,languages:{"de-DE":de,en,"x-default":de}} });
}

export default function ReleaseToolPage({tool,lang}: {tool:AudioReleaseTool;lang:Lang}) {
  const copy=AUDIO_RELEASE_TOOLS[tool][lang], [heading,intro,details,related,relatedLabel]=bodies[tool][lang];
  const Component=tools[tool], en=lang==="en";
  return <div className="tools-page"><Header lang={lang}/><main lang={lang}>
    <section className={styles.page}>
      <ToolLanguageNav lang={lang}/>
      <Link className="tool-back" href={en?"/en/tools":"/tools"}><ArrowLeft size={15}/>{en?"All tools":"Alle Tools"}</Link>
      <header className="stream-hero"><h1>{copy.title}</h1><p>{copy.summary}</p></header>
      <Component lang={lang}/>
      <section className="glass-panel p-6 mt-8">
        <h2 className="text-xl font-bold mb-3">{heading}</h2><p>{intro}</p><p className="mt-3">{details}</p>
        <p className="mt-4 flex flex-wrap gap-4"><Link href={related}>{relatedLabel} →</Link>
          <Link href={(en?"/en/knowledge":"/ressourcen")+"/master-vergleichen-und-veroeffentlichen"}>{en?"Practical release guide →":"Praxisleitfaden zum Release →"}</Link></p>
      </section>
    </section>
  </main><Footer lang={lang}/></div>;
}
