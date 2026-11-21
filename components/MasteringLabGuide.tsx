import Link from "next/link";
import type { Lang } from "@/lib/types/mastering";

export default function MasteringLabGuide({ lang, sidechain = false, compact = false }: { lang: Lang; sidechain?: boolean; compact?: boolean }) {
  const en = lang === "en";
  const root = en ? "/en" : "";
  return <section className="glass-panel p-6 mt-8" id="mastering-lab-guide">
    <h2 className="text-xl font-bold mb-4">{sidechain
      ? en ? "How to duck the bass in an EDM mix" : "So setzt du Bass-Ducking im EDM-Mix ein"
      : en ? "Manual mastering in four steps" : "Manuelles Mastering in vier Schritten"}</h2>
    {sidechain ? <ol className="grid md:grid-cols-2 gap-4 text-sm">
      <li><strong>{en ? "1. Open a stereo track." : "1. Stereotrack öffnen."}</strong> {en ? "Use the demo or load your own track and loop a section where kick and bass play together." : "Lade die Demo oder einen eigenen Track und loope eine Stelle, an der Kick und Bass zusammen spielen."}</li>
      <li><strong>{en ? "2. Start with 1–2 dB." : "2. Mit 1–2 dB starten."}</strong> {en ? "Try a bass cutoff around 80–90 Hz and watch the detected hits. Raise the threshold if the sustained bass triggers the effect." : "Probiere eine Grenze um 80–90 Hz und beobachte erkannte Impulse. Wenn anhaltender Bass den Effekt auslöst, hebe die Schwelle an."}</li>
      <li><strong>{en ? "3. Compare at the same level." : "3. Bei gleichem Pegel vergleichen."}</strong> {en ? "Listen for clearer space between hits without thinning the kick. Shorten recovery if ducking carries into the next beat." : "Achte auf Platz zwischen den Schlägen und darauf, dass die Kick kräftig bleibt. Verkürze die Rückkehr, wenn die Absenkung bis zum nächsten Schlag anhält."}</li>
      <li><strong>{en ? "4. Export with activation." : "4. Mit Freischaltung exportieren."}</strong> {en ? "The preview runs in your browser. The download requires the same account activation as Mastering Lab. With a stereo mix, the effect acts on the combined low end." : "Die Vorschau läuft im Browser. Für Downloads gilt dieselbe Kontofreischaltung wie im Mastering Lab. Bei einem Stereomix wirkt der Effekt auf den gemeinsamen Tiefbass."}</li>
    </ol> : <ol className="grid md:grid-cols-2 gap-4 text-sm">
      <li><strong>{en ? "1. Pick a starting point." : "1. Startpunkt wählen."}</strong> {en ? "Open a track and choose a preset, or have platform, genre and intensity suggest editable settings after sign-in." : "Öffne einen Track und wähle ein Preset. Nach Anmeldung können Plattform, Genre und Intensität passende Startwerte vorschlagen."}</li>
      <li><strong>{en ? "2. Make small changes." : "2. Kleine Änderungen hören."}</strong> {en ? "Use knobs or faders, check which modules are active and compare the original, two saved snapshots, or the chain with one module bypassed." : "Nutze Drehregler oder Fader, prüfe aktive Module und vergleiche Original, zwei Bearbeitungsstände oder die Kette mit einem vorübergehend überbrückten Modul."}</li>
      <li><strong>{en ? "3. Read headroom and loudness." : "3. Reserve und Lautheit einordnen."}</strong> {en ? "If the preview needs 1 dB to reach target and has 1.5 dB of estimated headroom, audition a small input gain increase and measure again." : "Fehlt zum Ziel 1 dB und die Vorschau zeigt 1,5 dB geschätzte Reserve, kannst du den Eingangspegel vorsichtig anheben und erneut messen."}</li>
      <li><strong>{en ? "4. Export and verify." : "4. Exportieren und prüfen."}</strong> {en ? "Choose from seven formats once your account is enabled. The output card reports measured loudness and true peak of the encoded file." : "Wähle nach Freischaltung eines von sieben Formaten. Der Export zeigt gemessene Lautheit und True Peak der codierten Datei."}</li>
    </ol>}
    {sidechain && <p className="mt-4 text-sm">{en
      ? "With separate stems, export kick and bass from the same time zero. The kick is the trigger. Adjust depth and recovery while listening, then export the processed bass by itself."
      : "Für getrennte Spuren exportiere Kick und Bass ab demselben Zeitnullpunkt. Die Kick löst die Absenkung aus. Stelle Stärke und Rückkehr beim Hören ein und exportiere den bearbeiteten Bass als Einzelspur."}</p>}
    <p className="text-sm mt-5 flex flex-wrap gap-5">
      {sidechain || compact ? <Link href={root + "/mastering-lab"}>{en ? "Open Mastering Lab →" : "Mastering Lab öffnen →"}</Link> : null}
      {!sidechain && <Link href={root + "/tools/kick-bass-sidechain"}>{en ? "Try Kick & Bass Sidechain →" : "Kick & Bass Sidechain ausprobieren →"}</Link>}
      <Link href={root + (sidechain ? "/tools/kick-bass-conflict" : "/help")}>{sidechain ? (en ? "Analyze kick and bass overlap →" : "Kick und Bass auf Überlagerung prüfen →") : (en ? "Read the FAQ →" : "FAQ lesen →")}</Link>
      <Link href={en ? "/en/knowledge/mastering-lab-pegel-kick-bass" : "/ressourcen/mastering-lab-pegel-kick-bass"}>{en ? "Headroom and ducking examples →" : "Praxisbeispiele zu Pegelreserve und Ducking →"}</Link>
    </p>
  </section>;
}
