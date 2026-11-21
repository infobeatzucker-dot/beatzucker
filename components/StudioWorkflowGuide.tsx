import Link from "next/link";
import type { Lang } from "@/lib/types/mastering";
import MasteringLabGuide from "./MasteringLabGuide";
import ReleaseToolsGuide from "./ReleaseToolsGuide";

export default function StudioWorkflowGuide({ lang }: { lang: Lang }) {
  const en = lang === "en";
  const tools = en ? "/en/tools" : "/tools";
  const studio = en ? "/en/studio-beta" : "/studio-beta";
  const article = en ? "/en/knowledge/re-beatz-online-mastering-mit-kontrolle" : "/ressourcen/re-beatz-online-mastering-mit-kontrolle";
  return <><section id="studio-guide" className="glass-panel p-5 mt-6 scroll-mt-28" style={{ color: "var(--text-secondary)" }}>
    <h3 className="text-lg font-bold mb-3" style={{ color: "var(--text-primary)" }}>{en ? "Listening and adjusting in the studio" : "Im Studio hören und nachjustieren"}</h3>
    <div className="grid sm:grid-cols-2 gap-4 text-sm leading-relaxed">
      <div><h4 className="font-semibold"><Link href={studio}>{en ? "Try Studio Mode →" : "Studio Mode ausprobieren →"}</Link></h4><p>{en
        ? "Try the demo without signing in and switch between the waveform and the live spectrum. For your own track, sign in and use the upload area at the top of the console. After analysis, choose your settings and export format. Select “Master track” to follow the processing stages in a pop-up."
        : "Höre den Demo-Track ohne Anmeldung und wechsle zwischen Wellenform und Live-Spektrum. Melde dich für deinen eigenen Track an und nutze das Upload-Feld oben in der Konsole. Nach der Analyse wählst du Einstellungen und Exportformat. Mit „Track mastern“ öffnet sich das Pop-up mit den Verarbeitungsschritten."}</p></div>
      <div><h4 className="font-semibold">{en ? "Fine-tune directly in Studio Mode" : "Direkt im Studio Mode feinabstimmen"}</h4><p>{en
        ? "After mastering, compare Original and Master in the monitor. Open Fine-tuning to adjust EQ, dynamics, stereo and saturation directly in the console. Audition a loop, create a new master to apply your changes to the entire track, then open Downloads. The up arrow returns you to the top."
        : "Vergleiche nach dem Mastering Original und Master im Monitor. Unter „Feinabstimmung“ passt du EQ, Dynamik, Stereo und Sättigung direkt in der Konsole an. Höre einen Loop vor, erstelle einen neuen Master für den ganzen Track und öffne anschließend „Downloads“. Der Pfeil unten bringt dich zurück nach oben."}</p></div>
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
      <div><h4 className="font-semibold">{en ? "Try the stem mixers" : "Spurenmixer ausprobieren"}</h4><p>{en
        ? <>Try the public <Link href={`${tools}/stem-separation#demo`}>four-stem demo</Link> or <Link href={`${tools}/vocal-remover#demo`}>Vocal Remover demo</Link> with faders, mute and solo. Full WAV downloads for your own tracks require enabled access.</>
        : <>Probiere die öffentliche <Link href={`${tools}/stem-separation#demo`}>Demo mit vier Stems</Link> oder die <Link href={`${tools}/vocal-remover#demo`}>Vocal-Remover-Demo</Link> mit Fadern, Mute und Solo. Vollständige WAV-Downloads für eigene Tracks erfordern eine Freischaltung.</>}</p></div>
      <div><h4 className="font-semibold">{en ? "Cutting and checking low end" : "Schneiden und Tiefbass prüfen"}</h4><p>{en
        ? <>The <Link href={`${tools}/audio-cutter`}>Audio Cutter</Link> magnifies the waveform at each cut and marks the fades. In the <Link href={`${tools}/kick-bass-conflict`}>Kick/Bass check</Link>, select a frequency range to inspect the overlap.</>
        : <>Der <Link href={`${tools}/audio-cutter`}>Audio-Cutter</Link> vergrößert die Wellenform am Schnittpunkt und markiert die Fades. In der <Link href={`${tools}/kick-bass-conflict`}>Kick/Bass-Analyse</Link> kannst du einzelne Frequenzbereiche auf Überlagerungen prüfen.</>}</p></div>
    </div>
    <p className="mt-4 text-sm leading-relaxed">{en
      ? "Choose a color theme in the navigation. The studio controls follow it, and you can save your choice in your dashboard. If something goes wrong, select “Report a problem” at the bottom left to prepare an email draft."
      : "Wähle ein Farbschema in der Navigation. Die Studio-Bedienelemente passen sich an und du kannst deine Auswahl im Dashboard speichern. Wenn etwas schiefläuft, öffne unten links „Problem melden“, um eine E-Mail vorzubereiten."}</p>
  </section><MasteringLabGuide lang={lang} compact/><ReleaseToolsGuide lang={lang}/></>;
}
