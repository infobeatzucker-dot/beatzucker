import type { RessourceArticle } from "./ressourcen";

export const MASTERING_LAB_ARTICLE: RessourceArticle = {
  slug: "mastering-lab-pegel-kick-bass",
  category: "Technik",
  categoryColor: "#3fbdf2",
  publishedAt: "2026-11-21",
  heroIcon: "🎚",
  readingTimeMinutes: 5,
  title: { de:"Manuelles Mastering mit Pegelreserve und Kick-Ducking", en:"Manual mastering with headroom and kick ducking" },
  metaTitle: { de:"Manuelles Mastering: Pegelreserve und Kick-Ducking", en:"Manual Mastering: Headroom and Kick Ducking" },
  metaDescription: { de:"Manuelles Online-Mastering in der Praxis. Ziel-LUFS und True Peak einordnen, zwei Presets vergleichen und mit Bass-Ducking Platz für die Kick schaffen.", en:"Practical manual mastering. Understand target LUFS and true peak, compare two edits and use bass ducking to make space around the kick." },
  keywords: { de:["manuelles Mastering","Pegelreserve","Bass-Ducking","True Peak"], en:["manual mastering","headroom","bass ducking","true peak"] },
  teaser: { de:"Zwei Praxisfälle zeigen, wann du am Pegel nachregeln kannst und wie du Bass-Ducking im EDM-Mix sinnvoll dosierst.", en:"Two practical cases show when you can adjust gain and how to use bass ducking in an EDM mix." },
  relatedSlugs: ["re-beatz-online-mastering-mit-kontrolle", "lufs-erklaert"],
  content: {
    intro: { de:"Im Mastering Lab kannst du mit einem neutralen Ausgangspunkt, einem Preset oder den vorgeschlagenen Auto-Werten beginnen. In allen Fällen entscheidest du im Hörvergleich, welche Einstellungen deinem Mix helfen.", en:"Mastering Lab lets you start from neutral, a preset or suggested auto settings. Use the listening comparison to decide which changes help your mix." },
    sections: [
      { h2: { de:"Praxisbeispiel 1 – Einen leisen Mix anheben", en:"Example 1 – Raising a quiet mix" },
        body: { de:"Deine Vorschau zeigt −15,5 LUFS und rund −3 dBTP. Bei einem Ziel von −14 LUFS und einer Spitzengrenze von −1 dBTP fehlen 1,5 LU, während ungefähr 2 dB Reserve vorhanden sind. Probiere eine kleine Anhebung am Eingang und prüfe erneut. Wenn eine bereits aktive Dynamikstufe reagiert, kann die Lautheit um weniger als den eingestellten dB-Wert steigen.", en:"Your preview reads −15.5 LUFS and around −3 dBTP. With a −14 LUFS target and a −1 dBTP ceiling, the gap is 1.5 LU and estimated headroom is roughly 2 dB. Try a small increase in input gain and check again. If an active dynamics stage responds, the loudness change can be smaller than the gain change." } },
      { h2: { de:"Praxisbeispiel 2 – Kick und Bass im EDM-Loop", en:"Example 2 – Kick and bass in an EDM loop" },
        body: { de:"Markiere eine Passage mit Kick und Bass und starte mit 1–2 dB Absenkung. Beobachte die Impulsmarkierungen und verkürze die Rückkehr, wenn der Bass zu lange wegbleibt. Vergleiche danach Original und Bearbeitung mit angeglichener Lautheit. Bei einem fertigen Stereomix wird auch der tiefe Anteil der Kick mitbearbeitet. Getrennte Kick- und Bassspuren erlauben gezielteres Sidechaining im Mix.", en:"Loop a passage with kick and bass and start with 1–2 dB of ducking. Watch the hit markers and shorten recovery if the bass stays down too long. Compare the original and processed versions at matched loudness. A stereo mix includes the kick in its low band. Separate kick and bass stems allow more targeted sidechaining in the mix." } },
      { h2: { de:"Bearbeitungsstände vergleichen und exportieren", en:"Compare snapshots and export" },
        body: { de:"Speichere eine dezente und eine kräftigere Einstellung in A und B. Schalte im selben Loop zwischen beiden um und gleiche die Lautheit an. Übernimm den bevorzugten Stand zum Export. Beide Tools verwenden für den Download dieselbe persönliche Freischaltung. Maßgeblich sind die Messwerte der fertigen Datei nach dem Codieren.", en:"Save a subtle and a stronger setting in A and B. Switch between them in the same loop and match loudness. Load the preferred version before export. Both tools use the same account activation for downloads. Use the measurements of the encoded file for delivery." } },
    ],
  },
};
