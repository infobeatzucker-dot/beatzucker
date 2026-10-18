import type { Lang } from "./types/mastering";
import type { StereoResult } from "./workerAnalysis";

export type StereoAdvice = { id: string; title: string; text: string };
// Listening prompts, not mastering thresholds or a quality score.
export function stereoAdvice(result: StereoResult, lang: Lang): StereoAdvice[] {
  const en = lang === "en";
  if (!result.valid) return [{ id: "silent", title: en ? "No usable measurement" : "Keine verwertbare Messung", text: en ? "The signal is silent or too quiet for this analysis. Choose a file with audible content; no phase verdict is possible." : "Das Signal ist still oder für diese Analyse zu leise. Wähle eine Datei mit hörbarem Inhalt; ein Phasenurteil ist hier nicht möglich." }];
  const advice: StereoAdvice[] = [];
  const bass = result.bands.find(band => band.name === "< 160 Hz");
  if (!result.widthDefined || result.correlation < 0) advice.push({ id: "phase", title: en ? "Check cancellation in mono" : "Auslöschung in Mono prüfen", text: en ? "Opposing channel content was measured. In your DAW, listen to vocals, kick and bass in mono; bypass wideners one at a time. Do not invert an entire channel blindly." : "Gegenläufige Kanalanteile wurden gemessen. Höre Stimme, Kick und Bass in der DAW in Mono ab; deaktiviere Verbreiterer einzeln. Nicht blind einen ganzen Kanal umpolen." });
  if (bass?.valid && bass.correlation < 0) advice.push({ id: "bass", title: en ? "Start with the low end" : "Beim Bass anfangen", text: en ? "The low-band correlation is negative. Inspect bass wideners, layered kicks and stereo effects in the mix. Change only the source that actually loses energy in mono." : "Die Korrelation im Bassband ist negativ. Prüfe Bass-Verbreiterer, geschichtete Kicks und Stereo-Effekte im Mix. Ändere nur die Quelle, die in Mono tatsächlich Energie verliert." });
  if (result.monoLoss < -6) advice.push({ id: "mono", title: en ? "Audition the mono level change" : "Mono-Pegeländerung gegenhören", text: en ? "The measured mono RMS is more than 6 dB lower. This is a listening prompt, not a failure limit. Listen for missing elements before adjusting width; gain alone cannot restore cancelled content." : "Der gemessene Mono-RMS liegt mehr als 6 dB niedriger. Das ist ein Hörhinweis, keine Fehlergrenze. Prüfe fehlende Elemente vor einer Breitenänderung; mehr Pegel stellt ausgelöschte Anteile nicht wieder her." });
  if (Math.abs(result.balance) > 3) advice.push({ id: "balance", title: en ? "Check the channel balance" : "Kanalbalance prüfen", text: en ? "The average channel levels differ by more than 3 dB. Check whether this is intentional panning, an arrangement choice or a recording issue. A centred mix is not a requirement." : "Die mittleren Kanalpegel unterscheiden sich um mehr als 3 dB. Prüfe, ob Panorama, Arrangement oder Aufnahme dafür verantwortlich sind. Ein mittiger Mix ist keine Pflicht." });
  if (!advice.length) advice.push({ id: "listen", title: en ? "Make a listening comparison" : "Mit Hörvergleich weiterprüfen", text: en ? "These whole-file values show no issue covered by these prompts. They can hide short cancellations. Check important sections in mono and compare a reference at similar loudness." : "Diese Gesamtwerte zeigen keinen der hier erfassten Hinweise. Sie können kurze Auslöschungen verdecken. Prüfe wichtige Stellen in Mono und vergleiche eine Referenz bei ähnlicher Lautheit." });
  return advice;
}

export function stereoStatus(result: StereoResult, lang: Lang): string {
  const en = lang === "en";
  if (!result.valid) return en ? "No measurable audio signal" : "Kein messbares Audiosignal";
  if (!result.widthDefined || result.correlation < 0) return en ? "Possible mono cancellation — listen closely" : "Mögliche Mono-Auslöschung – gezielt gegenhören";
  if (result.bands.some(band => band.valid && band.correlation < 0)) return en ? "Check individual frequency bands" : "Einzelne Frequenzbereiche prüfen";
  return en ? "Measurement complete — check in context" : "Messung abgeschlossen – im Kontext prüfen";
}
