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
  version: "0.14.0",
  date: "2026-10-17",
  title: { de: "Gezielter bearbeiten. Genauer vorhören.", en: "More focused processing. Closer previews." },
  summary: { de: "Die Frequenzaufteilung wurde korrigiert. Die Automatik beurteilt Klangbalance unabhängig vom Dateipegel und behandelt bereits dichte Mischungen zurückhaltender.", en: "Frequency splitting has been corrected. Automatic decisions use tonal balance independently of file level and treat already dense mixes more gently." },
  improvements: {
    de: ["Bass-Trennung und das Zusammenfügen der Frequenzbänder wurden korrigiert, damit keine unbeabsichtigten Pegelsenken entstehen.", "Referenzvergleich und zusätzliche Höhenkorrektur orientieren sich an relativer Klangbalance statt an der Lautstärke des Uploads.", "Kompression setzt sanfter ein. Bereits dichte Mischungen werden zurückhaltender bearbeitet; die Erholungszeiten richten sich nach der gemessenen Dynamik.", "Das Bass-Stereobild bleibt ohne gemessenes Tieftonproblem erhalten. Bei der manuellen Bearbeitung kannst du die Bass-Bündelung selbst einstellen.", "Die Live-Vorschau übernimmt mehr Eigenschaften der Export-Kette. Ein optionaler Server-Kontrollrender prüft bis zu 20 Sekunden ohne Master-Kontingent; Abschnittslautheit und Randkontext können vom vollständigen Export abweichen."],
    en: ["Bass splitting and frequency-band recombination have been corrected to avoid unintended level dips.", "Reference comparison and additional treble correction use relative tonal balance rather than upload loudness.", "Compression starts more gradually. Already dense mixes receive less processing, with recovery times based on measured dynamics.", "Bass stereo is preserved unless a low-frequency problem is measured. Manual adjustments now include a bass-narrowing control.", "Live preview shares more properties with the export chain. An optional server control render checks up to 20 seconds without using master quota; section loudness and boundary context can differ from the full export."],
  },
}, {
  version: "0.13.0",
  date: "2026-10-14",
  title: { de: "Audio-Tools im Blick.", en: "Keeping track of audio tools." },
  summary: { de: "Eine neue interne Übersicht hilft dem Betreiber zu erkennen, welche Audio-Tools genutzt werden und wo Probleme gemeldet werden.", en: "A new internal overview helps the operator see which audio tools are used and where problems are reported." },
  improvements: {
    de: ["Die Admin-Übersicht zeigt Tool-Vorgänge, Ergebnisse und Fehler für 7, 30 oder 90 Tage sowie einen Tagesverlauf.", "Die Statistik speichert keine Audiodaten, Dateinamen oder Kontoverknüpfungen. Browsermeldungen können unvollständig sein; die Datenschutzhinweise erklären die Erfassung."],
    en: ["The admin overview shows tool operations, outcomes and errors over 7, 30 or 90 days, with a daily activity chart.", "The statistics store no audio, filenames or account links. Browser reports may be incomplete; the privacy information explains the collection."],
  },
}, {
  version: "0.12.0",
  date: "2026-10-12",
  title: { de: "Vom Messwert zum nächsten Schritt.", en: "From measurements to your next step." },
  summary: { de: "Praxisbeispiele und passende Ratgeber helfen dir, Tool-Ergebnisse einzuordnen. Die Bibliothek lässt sich mit Mehrfachauswahl leichter aufräumen.", en: "Practical examples and matching guides help you interpret tool results. Multi-select makes your library easier to organize." },
  improvements: {
    de: [
      "Alle Audio-Tools haben konkrete Praxisbeispiele. Wissensartikel führen direkt zu passenden Tools – und nach der Analyse bekommst du sinnvolle nächste Schritte.",
      "Verarbeitung, Erfolg, unvollständige Ergebnisse und Fehler sind einheitlich erkennbar. Eine abgeschlossene Analyse ist kein Versprechen, dass dein Audio fehlerfrei ist.",
      "In der Bibliothek kannst du mehrere Einträge oder alle abgeschlossenen Einträge auswählen und nach einer Bestätigung gemeinsam löschen. Fehlgeschlagene Löschungen bleiben sichtbar.",
      "Die Sitemap enthält passende Änderungsdaten und verbindet die deutschen und englischen Seiten für Suchmaschinen.",
      "Der Betreiber erhält eine interne Nachricht bei neuen E-Mail- und Google-Konten. Versandprobleme werden erneut versucht, ohne die Registrierung zu blockieren. Die Datenschutzhinweise erklären die verwendeten Angaben.",
    ],
    en: [
      "Every audio tool has a practical example. Guides link directly to matching tools, and completed analyses offer useful next steps.",
      "Processing, completion, incomplete results and errors share clear status displays. A completed analysis is not a promise that your audio is free of issues.",
      "Select several library entries or all finished entries and delete them together after confirmation. Failed deletions remain visible.",
      "The sitemap uses appropriate modification dates and connects German and English pages for search engines.",
      "The operator receives internal notifications for new email and Google accounts. Delivery failures are retried without blocking registration. The privacy information explains which details are used.",
    ],
  },
}, {
  version: "0.11.0",
  date: "2026-10-11",
  title: { de: "Audio-Tools mit verlässlicheren Ergebnissen.", en: "Audio tools with more reliable results." },
  summary: {
    de: "Unsere Audio-Tools zeigen Grenzen und fehlende Messungen klarer. Vergleiche, Live-Bearbeitung und Exporte wurden überarbeitet; Deutsch und Englisch lassen sich direkt im Tool wechseln.",
    en: "Our audio tools explain limitations and missing measurements more clearly. Comparisons, live processing and exports have been improved, with a direct German/English switch in each tool.",
  },
  improvements: {
    de: [
      "Die Vocal Chain verwendet für Vorschau und Export dieselbe Bearbeitung. Bei 0 % sind De-Esser und Kompressor wirklich aus. Ein wählbarer Exportschutz verhindert das Abschneiden übersteuerter Samples.",
      "Der Kick-/Bass-Vergleich berücksichtigt auch kurze Ereignisse und gegenphasige Spuren. Stille erzeugt keinen scheinbaren Konflikt mehr.",
      "Beim Referenzvergleich kannst du beide Tracks pegelangepasst anhören und Klangfarbe unabhängig vom Gesamtpegel vergleichen.",
      "Der Album-Check kennzeichnet unvollständige Analysen und kann fehlende Tracks erneut prüfen, ohne erfolgreiche Ergebnisse zu verlieren.",
      "Streaming-Vorschauen unterscheiden Prognosen von tatsächlich gemessenen Codec-Werten. Der codierte Vergleich wird genauer im Pegel angepasst.",
      "Im Trimmer lassen sich Schnittpunkte direkt an der Wellenform verschieben und der ausgewählte Bereich vorhören.",
      "Der WAV-Konverter prüft den Speicherbedarf vor der Verarbeitung und warnt vor übersteuerten Integer-Exporten. Eine Pegelabsenkung bleibt deine Entscheidung.",
      "Stereo- und Tonart-Checks zeigen bei Stille oder fehlenden brauchbaren Werten keine scheinbar sicheren Ergebnisse. Fehlermeldungen und Sprachwechsel wurden vereinheitlicht.",
    ],
    en: [
      "The Vocal Chain uses the same processing for preview and export. At 0%, de-esser and compressor are truly bypassed. Optional export protection prevents overloaded samples from being clipped.",
      "Kick/bass comparison includes short events and opposing-phase tracks. Silence no longer produces a misleading conflict score.",
      "Reference comparison lets you audition both tracks with level matching and compare tonal balance separately from overall loudness.",
      "Album checks flag incomplete analyses and retry missing tracks without losing successful results.",
      "Streaming previews distinguish predictions from measured codec values. The encoded comparison has more accurate level matching.",
      "Trim points can be dragged directly on the waveform, and the selected section can be auditioned before export.",
      "The WAV converter checks memory requirements before processing and warns about overloaded integer exports. Gain reduction remains your choice.",
      "Stereo and key checks no longer present silence or missing usable measurements as reliable results. Error messages and language switching are more consistent.",
    ],
  },
}, {
  version: "0.10.0",
  date: "2026-10-11",
  title: { de: "Flüssigere Tools. Zuverlässigere Verarbeitung.", en: "Smoother tools. More reliable processing." },
  summary: {
    de: "Echte MP3- und AAC-Vorschauen werden gezielter geprüft. Bei hoher Auslastung schützt eine gemeinsame Grenze den Audiodienst vor zusätzlichen Vorschau-Aufträgen.",
    en: "Actual MP3 and AAC previews are checked more efficiently. Under heavy load, a shared limit protects the audio service from additional preview jobs.",
  },
  improvements: {
    de: [
      "Aufwendige Audioanalysen und WAV-Exporte laufen im Hintergrund, damit du die Oberfläche währenddessen weiter bedienen kannst.",
      "Analyzer pausieren außerhalb des sichtbaren Bereichs. Die Audiowiedergabe läuft im Hintergrund weiter; reduzierte Bewegung wird berücksichtigt.",
      "Anmeldung und Profil sind auch auf Englisch nutzbar. Verbindungsfehler lassen die Formulare nicht dauerhaft blockiert zurück.",
      "Neue Registrierungen bestätigen die aktuellen Nutzungsbedingungen auch bei Google-Anmeldung. Bestehende Konten bleiben erhalten.",
      "Die manuelle Loop-Auswahl bleibt auch bei kurzen Tracks innerhalb der Datei. Bereichsanzeige und Wiedergabe am Dateiende wurden abgesichert.",
      "Der Stereo-Check berücksichtigt das vollständige Signal und analysiert Frequenzbereiche ohne vorheriges Weglassen von Samples.",
      "Streaming-Vorschauen und Mastering teilen sich eine Auslastungsgrenze. Ist der Audiodienst voll, erhältst du einen Hinweis, es kurz darauf erneut zu versuchen.",
      "Eine kurze, begrenzte Warteschlange bevorzugt Mastering-Aufträge vor neu eintreffenden Tool-Anfragen.",
      "Spitzenpegel und Lautheit werden direkt an der codierten Datei gemessen – ohne unnötige erneute Tonart-, Tempo- und Spektralanalyse. Der Klang der Vorschau bleibt dabei unverändert.",
      "Uploads werden auch ohne Größenangabe begrenzt. Ungültige Dateien und nicht unterstützte Vorschauformate werden früher erkannt.",
      "Fehlende Messwerte werden nicht durch scheinbar korrekte Zahlen ersetzt. Echte AAC- und MP3-Vorschauen bleiben auch ohne verfügbare Messung hörbar.",
    ],
    en: [
      "Heavy audio analysis and WAV exports run in the background, keeping the interface available while they process.",
      "Analyzers pause outside the visible area. Audio playback continues in the background; reduced-motion preferences are respected.",
      "Sign-in and profile settings are available in English. Connection failures no longer leave forms permanently blocked.",
      "New registrations confirm the current terms, including Google sign-in. Existing accounts are preserved.",
      "Manual loop selection stays within the file, including short tracks. Range display and playback at the end of the file have been made more reliable.",
      "Stereo checks use the complete signal and analyze frequency regions without dropping samples beforehand.",
      "Streaming previews and mastering share a workload limit. If the audio service is busy, you are prompted to try again shortly.",
      "A short, bounded queue gives mastering jobs priority over newly arriving tool requests.",
      "Peak level and loudness are measured directly from the encoded file, without unnecessary key, tempo or spectrum analysis. The preview's sound stays unchanged during measurement.",
      "Uploads are limited even without a declared size. Invalid files and unsupported preview formats are detected earlier.",
      "Missing measurements are not replaced with seemingly correct numbers. Actual AAC and MP3 previews remain playable even when measurements are unavailable.",
    ],
  },
}, {
  version: "0.9.1",
  date: "2026-10-11",
  title: { de: "Mehr Kontoschutz. Genauere Audio-Ergebnisse.", en: "Safer accounts. More accurate audio results." },
  summary: {
    de: "Wichtige Kontoänderungen werden besser geschützt. Beim Kürzen und Normalisieren zeigen wir dir die gemessenen Werte des fertigen Ergebnisses.",
    en: "Important account changes are better protected. Trimming and normalization now show the measured values of the finished result.",
  },
  improvements: {
    de: [
      "Der Silence Normalizer misst den tatsächlich gewählten Ausschnitt nach Schnitt und Randfades. Die fertige WAV wird erneut geprüft; erreichte Lautheit und Spitzenpegel werden angezeigt.",
      "Unter „So funktioniert’s“ erklären wir, wie du nach dem Auto-Mastering manuell nachjustierst, Änderungen in der Live-Vorschau hörst und einen neuen Master erstellst.",
      "Zum Ändern des Passworts, Aktivieren oder Abschalten von 2FA und Löschen eines Passwort-Kontos wird das aktuelle Passwort geprüft. Bei bereits aktiver 2FA ist zusätzlich ein gültiger E-Mail-Code nötig.",
      "Google-Konten bestätigen sich vor der Kontolöschung erneut über Google, wenn die letzte Anmeldung länger als fünf Minuten zurückliegt.",
      "Eine Kontolöschung wartet auf laufende Masters. Audiodateien werden erst entfernt, nachdem die Kontolöschung erfolgreich gespeichert wurde.",
      "Nach einer Passwortänderung meldest du dich neu an. Alte Sitzungen dürfen die Kontoeinstellungen nicht mehr verändern.",
    ],
    en: [
      "Silence Normalizer measures the selected section after trimming and edge fades. The finished WAV is checked again, with its achieved loudness and peak displayed.",
      "How it works now explains how to fine-tune after auto-mastering, listen to your changes in the live preview and create a new master.",
      "Changing your password, enabling or disabling 2FA, and deleting a password account requires your current password. If 2FA is already enabled, a valid email code is also required.",
      "Google accounts confirm through Google again before account deletion if their last sign-in was more than five minutes ago.",
      "Account deletion waits for running masters. Audio files are removed only after the account deletion has been saved successfully.",
      "After a password change, you sign in again. Old sessions can no longer change account settings.",
    ],
  },
}, {
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
