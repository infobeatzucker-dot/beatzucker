import type { Lang } from "@/lib/types/mastering";

// Add a new entry for each significant release shipped together with a deploy.
// First entry = current app version. Never describe planned features as shipped.
export const RELEASES: {
  version: string;
  date: string;
  title: Record<Lang, string>;
  summary: Record<Lang, string>;
  improvements: Record<Lang, string[]>;
  retrospective?: boolean;
}[] = [{
  version: "0.9.0",
  date: "2026-10-11",
  title: { de: "Zuverlässiger arbeiten. Entspannter hören.", en: "More reliable tools. Smoother listening." },
  summary: {
    de: "Dieses Update verbessert die Sicherheit deines Kontos, die Audiovorschau und den Umgang mit deinen fertigen Masters.",
    en: "This update improves account security, audio previews and the handling of your finished masters.",
  },
  improvements: {
    de: [
      "Unter „In eigener Sache“ erklären wir, wie freiwillige Unterstützung Beatzucker kostenlos hält und den Ausbau ermöglicht.",
      "Widerrufe werden unabhängig vom Mailversand gespeichert. Bei Versandproblemen wird die Bestätigung automatisch erneut versucht, ohne deine Erklärung doppelt anzulegen.",
      "Audiovorschauen funktionieren auch nach dem Export oder dem Erstellen einer Streaming-Vorschau weiter.",
      "Passwort-Zurücksetzungen schützen dein Konto besser: Ältere Anmeldungen verlieren ihre Gültigkeit, und Login-Codes können nur einmal verwendet werden.",
      "Die Downloadfrist deiner fertigen Masters wird bei der automatischen Dateibereinigung berücksichtigt. Laufende Bearbeitungen bleiben geschützt.",
      "Unterbrochene Mastering-Aufträge werden regelmäßig geprüft, damit sie dein Konto nicht dauerhaft für neue Aufträge blockieren.",
      "32-Bit-Float-WAV-Exporte behalten ihren zusätzlichen Lautstärkespielraum. WAV- und FLAC-Dateien werden in den Browser-Tools mit ihrer ursprünglichen Abtastrate eingelesen, sofern der Browser diese unterstützt.",
      "Eine fehlende Spitzenpegel-Messung wird in der Streaming-Vorschau nicht mehr als gemessener Wert angezeigt. Beim Wechsel des Dateiformats wird eine alte Vorschau zurückgesetzt.",
      "Bestätigungsmails kommen von noreplay@beatzucker.de. Versandfehler werden erkannt; das Widerrufsformular bleibt bei Verbindungsproblemen erneut bedienbar.",
      "Die Versionsnummer und diese Übersicht zeigen dir künftig auf einen Blick, was sich verbessert hat.",
    ],
    en: [
      "A new support page explains how voluntary contributions help keep Beatzucker free and fund future capacity.",
      "Cancellation statements are stored independently of email sending. Failed confirmations are retried automatically without creating a duplicate statement.",
      "Audio previews keep working after an export or after generating a streaming preview.",
      "Password resets protect your account better: Older sign-ins expire, and login codes can only be used once.",
      "Automatic file cleanup respects the download window of your finished masters. Files being processed stay protected.",
      "Interrupted mastering jobs are checked regularly so they do not permanently block new jobs on your account.",
      "32-bit float WAV exports retain their extra headroom. Browser tools read WAV and FLAC files at their original sample rate when supported by your browser.",
      "A missing peak measurement is no longer displayed as a measured value in Streaming Preview. Changing the file format clears the old preview.",
      "Confirmation emails come from noreplay@beatzucker.de. Sending failures are detected, and the cancellation form remains usable after connection problems.",
      "The version number and this overview help you see what has improved with each update.",
    ],
  },
}, {
  version: "0.8.0", date: "2026-08-23", retrospective: true,
  title: { de: "Mehr Werkzeuge für deinen nächsten Release", en: "More tools for your next release" },
  summary: { de: "Ein eigener Tools-Bereich hilft dir beim Prüfen, Vergleichen und Vorbereiten deiner Musik.", en: "A dedicated tools area helps you check, compare and prepare your music." },
  improvements: {
    de: [
      "Streaming-Vorschau: Höre, wie sich eine angepasste Wiedergabelautstärke auswirkt, und vergleiche echte MP3- und AAC-Versionen.",
      "Tonart und Tempo erkennen, Kick und Bass vergleichen, Audioformate umwandeln und mehrere Album-Tracks gegenüberstellen.",
      "Weitere Helfer für Referenzvergleiche, Stereo-Prüfung, das Kürzen stiller Ränder und die Bearbeitung von Vocals.",
      "Mehr Erklärungen und Antworten direkt bei den Tools – damit du Messwerte besser einordnen kannst.",
      "Überarbeitete Informationen zu Datenschutz und Nutzungsbedingungen sowie ein Online-Widerrufsformular.",
    ],
    en: [
      "Streaming Preview: Hear the effect of adjusted playback loudness and compare actual MP3 and AAC versions.",
      "Detect key and tempo, compare kick and bass, convert audio formats and compare tracks across an album.",
      "Additional helpers for reference comparisons, stereo checks, trimming silent edges and vocal processing.",
      "More explanations and answers alongside the tools to help you understand the measurements.",
      "Updated privacy and terms information, plus an online cancellation form.",
    ],
  },
}, {
  version: "0.7.0", date: "2026-08-20", retrospective: true,
  title: { de: "Deinen Mix besser verstehen", en: "Understand your mix better" },
  summary: { de: "Neue Orientierung vor dem Mastering und klarere Informationen danach.", en: "More guidance before mastering and clearer information afterwards." },
  improvements: {
    de: [
      "Der öffentliche Mix-Check prüft deinen Track und hilft dir, mögliche Schwächen vor dem Mastering zu erkennen.",
      "Der Mastering-Bericht wurde überarbeitet und erklärt die Bearbeitung und Ergebnisse übersichtlicher.",
      "Englische Unterseiten sind direkt erreichbar; Navigation und Links zu den rechtlichen Informationen wurden vervollständigt.",
      "Die Regler der manuellen Nachbearbeitung lassen sich leichter per Maus und Tastatur bedienen.",
    ],
    en: [
      "The public Mix Check examines your track and helps identify potential issues before mastering.",
      "The mastering report was redesigned to explain processing and results more clearly.",
      "English pages have direct links, with more complete navigation and access to legal information.",
      "Manual adjustment controls are easier to use with both mouse and keyboard.",
    ],
  },
}, {
  version: "0.6.0", date: "2026-08-19", retrospective: true,
  title: { de: "Drehen. Hören. Feinabstimmen.", en: "Adjust. Listen. Fine-tune." },
  summary: { de: "Manuelle Klangkorrekturen werden während der Wiedergabe hörbar – ohne für jede Änderung neu rendern zu müssen.", en: "Hear manual sound adjustments during playback without rendering every individual change." },
  improvements: {
    de: [
      "Die manuelle Nachbearbeitung wurde auf direkte Audiovorschau umgestellt.",
      "Weniger Ruckeln beim Einstellen der Regler und zuverlässigeres Vorhören des gewählten Ausschnitts.",
      "Nachjustierte Einstellungen können für eine neue Bearbeitung des Masters übernommen werden.",
      "Die Mastering-Verarbeitung wurde überprüft; wirkungslose Schritte und unbemerkte Ersatzlösungen wurden korrigiert.",
    ],
    en: [
      "Manual fine-tuning switched to immediate audio preview.",
      "Smoother controls and more reliable listening to the selected section.",
      "Fine-tuned settings can be used to process the master again.",
      "Mastering processing was reviewed, correcting ineffective steps and unnoticed fallback behaviour.",
    ],
  },
}, {
  version: "0.5.0", date: "2026-08-18", retrospective: true,
  title: { de: "Mehr Kontrolle über deinen Sound", en: "More control over your sound" },
  summary: { de: "Die automatische Bearbeitung wurde genauer abgestimmt und um manuelle Nachjustierung ergänzt.", en: "Automatic processing was refined and extended with manual adjustments." },
  improvements: {
    de: [
      "Manuelle Nachbearbeitung ergänzt das automatische Mastering.",
      "Lautheit und Dynamik wurden mit echten Musikdateien geprüft; dabei gefundene Mess- und Verarbeitungsfehler wurden behoben.",
      "Die Fortschrittsanzeige folgt den tatsächlichen Bearbeitungsschritten und springt bei langsamen Abschnitten nicht mehr zurück.",
    ],
    en: [
      "Manual adjustments complement automatic mastering.",
      "Loudness and dynamics were tested with real music files, correcting measurement and processing errors found along the way.",
      "Progress follows the actual processing steps and no longer jumps backwards during slower stages.",
    ],
  },
}, {
  version: "0.4.0", date: "2026-08-18", retrospective: true,
  title: { de: "Ein neuer Look für deinen Workspace", en: "A new look for your workspace" },
  summary: { de: "Eine modernere Oberfläche macht Mastering und die Verwaltung deiner Tracks übersichtlicher.", en: "A more modern interface makes mastering and managing your tracks easier to navigate." },
  improvements: {
    de: [
      "Neue blau-violette Gestaltung mit ruhigeren Animationen und modernen Symbolen.",
      "Überarbeitete Dashboard-Karten, Preset-Auswahl und Seitenleiste.",
      "Ein eigener Workspace bündelt deine Tracks und wichtige Kontofunktionen.",
    ],
    en: [
      "A new blue-and-purple visual style with calmer animations and modern icons.",
      "Redesigned dashboard cards, preset selection and sidebar.",
      "A dedicated workspace brings your tracks and key account features together.",
    ],
  },
}, {
  version: "0.3.0", date: "2026-08-17", retrospective: true,
  title: { de: "Hallo, Beatzucker", en: "Hello, Beatzucker" },
  summary: { de: "Das Online-Mastering erhält seinen eigenen Namen und seine eigene Adresse.", en: "The online mastering service gets its own name and address." },
  improvements: {
    de: ["Beatzucker startet unter beatzucker.de mit eigener Markenidentität."],
    en: ["Beatzucker launches at beatzucker.de with its own brand identity."],
  },
}];

export const APP_VERSION = RELEASES[0].version;
export const RELEASE_DATE = RELEASES[0].date;
