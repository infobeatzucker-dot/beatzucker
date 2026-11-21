"use client";

import { useEffect, useRef, useState } from "react";
import type { Module } from "./settings";
import styles from "./lab.module.css";

type Lang = "de" | "en";
type Local = Record<Lang, string>;
const guides: Record<Module, Local> = {
  input: { de:"Stellt den Pegel vor allen Modulen ein. Senke ihn bei zu wenig Reserve oder hebe ihn vorsichtig an, wenn der Mix zu leise ist.", en:"Sets the level before all modules. Reduce it if peaks are too high, or raise it cautiously if the mix is quiet." },
  eq: { de:"Formt Tiefen, Tiefmitten, Präsenz und Höhen. Gain bestimmt die Änderung, Frequenz ihre Lage und Q die Breite der Glockenfilter. Der Hochpass filtert tiefe Störanteile.", en:"Shapes lows, low mids, presence and air. Gain sets the change, frequency its position and Q the width of bell filters. The high-pass removes very low content." },
  ducking: { de:"Erkennt Kick-ähnliche Impulse und senkt den Tiefbass des Stereomixes ab. Schalte den Loop ein, starte mit 1–2 dB und achte darauf, ob die Kick ihren Druck behält.", en:"Detects kick-like hits and ducks the low end of the stereo mix. Enable loop, start with 1–2 dB and listen for whether the kick keeps its punch." },
  deesser: { de:"Beruhigt kurze, scharfe Höhen, etwa Zischlaute und Becken. Prüfe im A/B, ob Stimmen klar bleiben.", en:"Reduces brief harsh highs such as sibilance and cymbal strikes. Use A/B to check that voices stay clear." },
  dynamics: { de:"Komprimiert vier Frequenzbereiche getrennt. Schwelle bestimmt, ab wann das Band reagiert. Ratio bestimmt, wie stark es reduziert wird.", en:"Compresses four frequency bands separately. Threshold determines when a band responds. Ratio determines how strongly it reduces gain." },
  stereo: { de:"Verändert Stereobreite und bündelt bei Bedarf den tiefen Bass in der Mitte. Prüfe breite Einstellungen auch in Mono.", en:"Changes stereo width and can centre the low bass. Check wide settings in mono as well." },
  saturation: { de:"Rundet Spitzen ab und fügt Klangfarbe hinzu. Nutze kleine Werte, wenn Transienten klar bleiben sollen.", en:"Rounds peaks and adds colour. Use small amounts to keep transients clear." },
  finalEq: { de:"Formt den Hochton nach der Sättigung. Kleine Korrekturen helfen, Glanz oder Schärfe abzustimmen.", en:"Shapes the high end after saturation. Use small moves to balance sheen or harshness." },
  bus: { de:"Verdichtet die Summe. Eine milde Einstellung kann Instrumente verbinden. Bei hörbarem Pumpen reduziere den Eingriff.", en:"Compresses the full mix. Gentle settings can bring instruments together. Back off if you hear pumping." },
  limiter: { de:"Fängt Spitzen am Ende der Kette ab. Drive erhöht den Eingang, die Obergrenze deckelt den Sample-Pegel und Release bestimmt die Erholung. Der Export prüft True Peak der fertigen Datei.", en:"Controls peaks at the end of the chain. Drive raises the input, ceiling caps sample level and release controls recovery. Export measures true peak on the finished file." },
};

export function LabHelp({ lang, selected, onClose, moduleNames, sidechain, controlGuides }: {
  lang: Lang; selected: Module | "overview"; onClose: () => void; moduleNames: Record<Module, string>; sidechain: boolean;
  controlGuides: Partial<Record<Module, { label: string; help: string }[]>>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const en = lang === "en";
  const basics = sidechain ? [
    [en ? "Upload & listen" : "Track laden & hören", en ? "Load a demo or your own track, select a preset, and compare original and processed audio in a loop. The light ticks mark detected hits." : "Lade den Demo-Track oder deine eigene Datei, wähle ein Preset und vergleiche Original und Bearbeitung im Loop. Helle Markierungen zeigen erkannte Impulse."],
    [en ? "Preview and export" : "Vorschau und Export", en ? "The preview runs in your browser. Downloads use the same account activation as Mastering Lab." : "Die Vorschau läuft im Browser. Downloads nutzen dieselbe Kontofreischaltung wie das Mastering Lab."],
  ] : [
    [en ? "Quick start" : "Schnellstart", en ? "Open a track, choose a preset at the top or start neutral. Mark a passage or pick the loudest section, start a loop, then compare original and processed." : "Öffne einen Track und wähle oben ein Preset oder starte neutral. Markiere eine Passage oder die lauteste Stelle, starte den Loop und vergleiche Original und Bearbeitung."],
    [en ? "Presets and comparison" : "Presets und Hörvergleich", en ? "Save two snapshots and switch between them at matched loudness. Use the module audition button to temporarily hear the chain without that one module. The export uses the current edit." : "Speichere zwei Bearbeitungsstände und höre sie bei angeglichener Lautheit ab. Beim Modulvergleich hörst du die Kette vorübergehend ohne das ausgewählte Modul. Exportiert wird der aktuelle Bearbeitungsstand."],
    [en ? "Auto settings, headroom and export" : "Auto-Werte, Pegel und Export", en ? "Choose a platform, genre and intensity and request a profile. Apply the proposal to edit its controls. Check the preview target and peak reserve. Export reports the measured loudness and true peak of the finished file." : "Wähle Plattform, Genre und Intensität und lasse ein Profil vorschlagen. Übernimm es zum Nachregeln. Prüfe danach Zielpegel und Spitzenreserve. Der Export zeigt gemessene Lautheit und True Peak der fertigen Datei."],
  ];
  const keys = (Object.keys(guides) as Module[]).filter(key => !sidechain || key === "ducking");
  const sections = keys.map(key => ({ key, title: moduleNames[key], text: guides[key][lang], controls: controlGuides[key] ?? [] }));
  if (selected !== "overview") sections.sort((a, b) => Number(b.key === selected) - Number(a.key === selected));
  const term = query.trim().toLocaleLowerCase(lang);
  const matches = (value: string) => value.toLocaleLowerCase(lang).includes(term);
  const filtered = sections.filter(section => matches([section.title, section.text, ...section.controls.flatMap(control => [control.label, control.help])].join(" ")));
  const filteredBasics = basics.filter(([title, body]) => matches(title + " " + body));
  useEffect(() => { ref.current?.showModal(); }, []);
  const overview = <div className={styles.helpBasics}>{filteredBasics.map(([title, body]) => <section key={title}><h3>{title}</h3><p>{body}</p></section>)}</div>;
  return <dialog ref={ref} className={styles.helpDialog} onClose={onClose} aria-labelledby="lab-help-title">
    <header><h2 id="lab-help-title">{en ? "Mastering help" : "Mastering-Hilfe"}</h2>
      <form method="dialog"><button>{en ? "Close" : "Schließen"}</button></form></header>
    <label>{en ? "Search help" : "Hilfe durchsuchen"} <input type="search" value={query} onChange={event => setQuery(event.currentTarget.value)}/></label>
    {selected === "overview" && overview}
    {filtered.map(section => <details key={section.key} open={section.key === selected || Boolean(term)}>
      <summary>{section.title}</summary><p>{section.text}</p>
      {section.controls.length > 0 && <dl>{section.controls.map(control => <div key={control.label}><dt>{control.label}</dt><dd>{control.help}</dd></div>)}</dl>}
    </details>)}
    {selected !== "overview" && overview}
    {!filtered.length && !filteredBasics.length && <p>{en ? "No matching topics." : "Keine passenden Themen."}</p>}
  </dialog>;
}
