import type { RessourceArticle } from "./ressourcen";

// Keep the established addresses and historical first-publication field.
// updatedAt describes this replacement; historical dates elsewhere are unaudited.
export const MANUAL_MASTERING_ARTICLE: RessourceArticle = {
  slug: "re-beatz-online-mastering-mit-kontrolle",
  category: "Tipps",
  categoryColor: "var(--accent-purple)",
  publishedAt: "2025-03-20",
  updatedAt: "2026-10-24",
  heroIcon: "Sliders",
  readingTimeMinutes: 5,
  title: {
    de: "Nach dem Auto-Mastering: deinen Sound manuell feinabstimmen",
    en: "After automatic mastering: fine-tune your sound manually",
  },
  metaTitle: {
    de: "Mastering manuell nachbearbeiten: Vorschau & Export | Beatzucker",
    en: "Fine-Tune an Automatic Master: Preview & Export | Beatzucker",
  },
  metaDescription: {
    de: "Nach dem Auto-Master EQ, Dynamik und Stereobreite nachjustieren: So nutzt du Live-Vorschau, Kontrollrender und einen neuen Master in Beatzucker.",
    en: "Adjust EQ, dynamics and stereo width after automatic mastering. Learn how live preview, section control renders and a new master work in Beatzucker.",
  },
  keywords: {
    de: ["Mastering manuell nachbearbeiten", "Auto Master feinabstimmen", "Mastering Live Vorschau"],
    en: ["fine-tune automatic master", "manual online mastering", "mastering live preview"],
  },
  teaser: {
    de: "Die Automatik liefert einen Ausgangspunkt. Mit kleinen manuellen Änderungen kannst du ihn an deinen Geschmack anpassen – und anschließend einen neuen Master erstellen.",
    en: "Automatic processing gives you a starting point. Make small manual changes to suit your taste, then create a new master with those settings.",
  },
  relatedSlugs: ["mix-fuer-mastering-vorbereiten", "stereo-breite-mastering", "true-peak-rms-lufs"],
  content: {
    intro: {
      de: "Dein Auto-Master klingt schon gut, aber du möchtest etwas weniger Bass, sanftere Höhen oder mehr Luft für Transienten? Öffne nach dem automatischen Mastering die manuelle Feinabstimmung in Beatzucker. Dort hörst du Regleränderungen in einer lokalen Live-Vorschau und kannst danach einen neuen Master mit deinen Einstellungen berechnen lassen.\n\nHinweis für bisherige Besucher: re-beatz.com wird nicht mehr als eigenständiger Dienst betrieben und verweist jetzt auf Beatzucker. Die bisherige Artikeladresse bleibt erhalten; dieser Ratgeber beschreibt den aktuellen Beatzucker-Ablauf.",
      en: "Your automatic master sounds good, but you would prefer less bass, gentler highs or more room for transients? Open manual fine-tuning after automatic mastering in Beatzucker. Audition control changes in a local live preview, then render a new master using your settings.\n\nFor returning visitors: re-beatz.com is no longer operated as a separate service and now points to Beatzucker. This article keeps its established address and describes the current Beatzucker workflow.",
    },
    sections: [
      {
        h2: { de: "1. Erst hören, dann gezielt ändern", en: "1. Listen first, then make a focused change" },
        body: {
          de: "Vergleiche Original und Auto-Master im Hauptplayer. A/B startet bei Originalpegeln; für einen fairen Klangvergleich kannst du den Lautheitsabgleich einschalten. Wähle eine Stelle, an der du das Problem tatsächlich hörst, zum Beispiel einen dichten Refrain oder einen hellen Gesangseinsatz. Ändere nicht vorsorglich jeden Regler.\n\nEin deutlich lauterer Vergleich wirkt oft zunächst besser. Vergleiche deshalb bei ähnlicher Abhörlautstärke und achte auf Klangbalance, Verständlichkeit und Anschläge statt nur auf Pegel.",
          en: "Compare the original and automatic master in the main player. A/B starts at original levels; enable loudness matching for a fairer tonal comparison. Choose a section where you actually hear the issue, such as a dense chorus or a bright vocal entry. There is no need to change every control.\n\nA much louder version can seem better at first. Compare at similar listening levels and focus on balance, clarity and attacks rather than volume alone.",
        },
      },
      {
        h2: { de: "2. Einen passenden Loop auswählen", en: "2. Choose a useful loop" },
        body: {
          de: "Im Bereich „Manuell“ positionierst du den Ausschnitt mit einem Klick in die Wellenform oder verschiebst ihn durch Ziehen. Die neue Position wird nach dem Loslassen übernommen. Wähle je nach Tracklänge einen Loop von 5, 8, 12 oder 20 Sekunden; „Lauteste Stelle“ hilft beim Finden eines dichten Abschnitts.\n\nDer gewählte Ausschnitt wird einmal geladen und anschließend aus dem Speicher wiederholt. Bei einer neuen Auswahl kann eine kurze Ladezeit entstehen. Während der Wiedergabe wirken Regleränderungen ohne jedes Mal einen neuen Server-Render anzustoßen.",
          en: "In manual fine-tuning, click the waveform to position the section or drag to move it. A new position is applied on release. Depending on track length, choose a 5-, 8-, 12- or 20-second loop; “Loudest part” helps locate a dense section.\n\nThe selected section loads once and then loops from memory. A new selection may take a moment to load. During playback, control changes are audible without requesting a new server render each time.",
        },
      },
      {
        h2: { de: "3. EQ, Dynamik und Stereo behutsam einstellen", en: "3. Adjust EQ, dynamics and stereo gently" },
        body: {
          de: "Beginne mit einer kleinen EQ-Änderung, wenn die Balance stört. Bei zu viel Verdichtung lohnt es sich, die Kompression vorsichtig zurückzunehmen und auf die Transienten zu hören. Prüfe Stereobreite und Bass-Bündelung auch im Hinblick auf Mono-Kompatibilität; breiter ist nicht automatisch besser.\n\nMit A/B in der manuellen Vorschau vergleichst du die Ausgangseinstellungen mit deinen Änderungen. Das ist ein anderer Vergleich als Original gegen fertigen Master im Hauptplayer. „Zurücksetzen“ stellt die Ausgangswerte im Dialog wieder her.",
          en: "Start with a small EQ change if the balance feels wrong. If the sound is too dense, ease back compression carefully and listen to transients. Judge stereo width and bass narrowing with mono compatibility in mind; wider is not automatically better.\n\nA/B in manual preview compares base settings with your changes. This differs from comparing the original with the finished master in the main player. Reset restores the dialog’s base settings.",
        },
      },
      {
        h2: { de: "4. Live-Vorschau und Kontrollrender unterscheiden", en: "4. Distinguish live preview from a control render" },
        body: {
          de: "Die Live-Vorschau ist eine latenzarme Näherung zum Einstellen, nicht der endgültige Export. Sie arbeitet mit 48 kHz und kurzen Randblenden am Loop. Die vollständige Mastering-Engine bestimmt anschließend unter anderem die finale Lautheit und Spitzenbegrenzung.\n\nOptional kannst du „Ausschnitt auf Server prüfen“ verwenden. Dabei wird der ausgewählte Abschnitt mit der Export-Signalkette verarbeitet, ohne Master-Kontingent zu verbrauchen. Da Lautheit und Randkontext nur aus diesem Abschnitt stammen, ist auch dieser Kontrollrender kein identischer Ausschnitt des späteren Gesamttrack-Masters.",
          en: "Live preview is a low-latency approximation for adjustment, not the final export. It uses 48 kHz and short fades at loop edges. The full mastering engine later determines final loudness and peak protection, among other processing.\n\nFor an additional check, use “Render section on server”. It processes the selected section with the export signal chain without using master quota. Because loudness and boundary context come from that section alone, it is not an identical excerpt of the eventual full-track master either.",
        },
      },
      {
        h2: { de: "5. Neuen Master erstellen und vollständig prüfen", en: "5. Create and check a new master" },
        body: {
          de: "Referenz- und Character-Einstellungen bleiben beim Stand des abgeschlossenen Masters. Deine manuellen Reglerwerte haben Vorrang. Eine Änderung dieser Auswahl im Dashboard gilt erst für den nächsten automatischen Lauf.\n\nWenn deine Änderungen passen, wähle „Neuen Master erstellen“. Erst nach dieser vollständigen Berechnung steht der neue Export zum Download bereit. Anders als die Vorschau ist das ein regulärer Mastering-Vorgang mit dem geltenden Tageskontingent.\n\nHöre die neue Datei auch außerhalb des gewählten Loops durch und prüfe die gemessenen Nachher-Werte. Lade erst dann die gewünschte Ausgabe herunter. Falls das Problem schon im Mix steckt – etwa Clipping oder ein zu lautes Einzelinstrument –, ist eine Korrektur in der DAW oft die bessere Lösung.",
          en: "Reference and character settings stay with the completed master. Your manual values take priority. Changing these selections in the dashboard applies to the next automatic run.\n\nWhen the changes work, choose “Create new master”. The new export is available to download after full processing completes. Unlike preview, this is a regular mastering operation subject to the current daily allowance.\n\nListen beyond the selected loop and review the measured output values before choosing your download. If the problem originates in the mix, such as clipping or an overly loud instrument, fixing it in your DAW is often the better option.",
        },
      },
    ],
    conclusion: {
      de: "Manuelle Feinabstimmung ist kein Pflichtschritt. Behalte einen gelungenen Auto-Master oder ändere nur, was du im Vergleich wirklich bevorzugst. Entscheidend ist die vollständig gerenderte Datei, nicht allein der Eindruck im Loop.",
      en: "Manual fine-tuning is optional. Keep a successful automatic master or change only what you genuinely prefer in comparison. Judge the full rendered file, not just the loop.",
    },
  },
};
