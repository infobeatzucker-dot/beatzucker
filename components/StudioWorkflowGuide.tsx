import Link from "next/link";
import type { Lang } from "@/lib/types/mastering";

export default function StudioWorkflowGuide({ lang }: { lang: Lang }) {
  const en = lang === "en";
  const tools = en ? "/en/tools" : "/tools";
  const article = en ? "/en/knowledge/re-beatz-online-mastering-mit-kontrolle" : "/ressourcen/re-beatz-online-mastering-mit-kontrolle";
  return <section id="studio-guide" className="glass-panel p-5 mt-6 scroll-mt-28" style={{ color: "var(--text-secondary)" }}>
    <h3 className="text-lg font-bold mb-3" style={{ color: "var(--text-primary)" }}>{en ? "Listening and adjusting in the studio" : "Im Studio hören und nachjustieren"}</h3>
    <div className="grid sm:grid-cols-2 gap-4 text-sm leading-relaxed">
      <div><h4 className="font-semibold">{en ? "After mastering" : "Nach dem Mastering"}</h4><p>{en
        ? "Switch between Original and Mastered in the monitoring section. The True Peak displays describe the exported files. Turn on loudness matching to compare tone at a similar level. The sound fingerprint shows measured frequency bands, and timeline markers jump to distinct local level changes."
        : "Wechsele in der Abhörsektion zwischen Original und Master. Die True-Peak-Anzeigen zeigen die Messwerte der Dateien. Nutze den Lautheitsabgleich für einen Klangvergleich bei ähnlichem Pegel. Der Klang-Fingerabdruck zeigt gemessene Frequenzbänder. Über die Zeitleiste springst du zu auffälligen Pegeländerungen."}</p></div>
      <div><h4 className="font-semibold"><Link href={article}>{en ? "Manual fine-tuning →" : "Manuelle Feinabstimmung →"}</Link></h4><p>{en
        ? "Choose a loop, adjust the EQ dials and use the stereo vectorscope or bus reduction meter. A/B switches between base settings and your edits. Render the section on the server for a second check, then create a new master once you are happy."
        : "Wähle einen Loop, stelle die EQ-Drehregler ein und prüfe das Stereo-Vektorskop oder die Bus-Pegelreduktion. A/B wechselt zwischen Ausgangswerten und deinen Änderungen. Prüfe den Ausschnitt bei Bedarf auf dem Server und erstelle danach einen neuen Master."}</p></div>
      <div><h4 className="font-semibold"><Link href={`${tools}/vocal-chain`}>Vocal Chain →</Link></h4><p>{en
        ? "Switch between original and processed vocals while listening. The mix dial blends both signals. The separate meters show how hard the de-esser and compressor are working. Render a WAV with the selected blend."
        : "Wechsele beim Hören zwischen Original und Bearbeitung. Der Mix-Regler mischt beide Signale. Die getrennten Anzeigen zeigen, wie stark De-Esser und Kompressor eingreifen. Rendere anschließend eine WAV mit dem gewählten Mix."}</p></div>
      <div><h4 className="font-semibold"><Link href={`${tools}/album-consistency`}>{en ? "Album monitoring →" : "Album-Abhöre →"}</Link></h4><p>{en
        ? "Measure two to eight songs, solo them one by one, and use the big dial to set a comparison target. Match preview adjusts playback gain within the measured true-peak headroom. Keep your files and use the suggestions for your next mix or master."
        : "Miss zwei bis acht Songs, höre sie einzeln per Solo und stelle am großen Regler ein Vergleichsziel ein. Die angeglichene Abhöre berücksichtigt den gemessenen True-Peak-Spielraum. Nutze die Pegelhinweise für deinen nächsten Mix oder Master."}</p></div>
      <div><h4 className="font-semibold"><Link href={`${tools}/stem-separation`}>{en ? "Stem mixer →" : "Spurenmixer →"}</Link></h4><p>{en
        ? "Use faders, mute and solo to check separated tracks in Stem Separation or Vocal Remover. The meters follow playback. Full WAV downloads are available with enabled access and use the original stem levels."
        : "Prüfe die getrennten Spuren in Stem Separation oder Vocal Remover mit Fadern, Mute und Solo. Die Anzeigen folgen der Wiedergabe. Mit Freischaltung kannst du die vollständigen WAV-Spuren in ihren Originalpegeln herunterladen."}</p></div>
      <div><h4 className="font-semibold">{en ? "Cutting and checking low end" : "Schneiden und Tiefbass prüfen"}</h4><p>{en
        ? <>The <Link href={`${tools}/audio-cutter`}>Audio Cutter</Link> magnifies the waveform at each cut and marks the fades. In the <Link href={`${tools}/kick-bass-conflict`}>Kick/Bass check</Link>, select a frequency range to inspect the overlap.</>
        : <>Der <Link href={`${tools}/audio-cutter`}>Audio-Cutter</Link> vergrößert die Wellenform am Schnittpunkt und markiert die Fades. In der <Link href={`${tools}/kick-bass-conflict`}>Kick/Bass-Analyse</Link> kannst du einzelne Frequenzbereiche auf Überlagerungen prüfen.</>}</p></div>
    </div>
    <p className="mt-4 text-sm leading-relaxed">{en
      ? "Choose a color theme in the navigation. The studio controls follow it, and you can save your choice in your dashboard. If something goes wrong, select “Report a problem” at the bottom left to prepare an email draft."
      : "Wähle ein Farbschema in der Navigation. Die Studio-Bedienelemente passen sich an und du kannst deine Auswahl im Dashboard speichern. Wenn etwas schiefläuft, öffne unten links „Problem melden“, um eine E-Mail vorzubereiten."}</p>
  </section>;
}
