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
  version:"1.6.1",date:"2026-10-27",
  title:{de:"Express: direkter vergleichen, mehr Platz im Studio",en:"Express: compare directly, more room in the studio"},
  summary:{de:"Ein grafischer Express-Button links lässt der Konsole mehr Platz. Der Assistent zeigt die laufende Analyse und bietet den Hörvergleich direkt im Ergebnisfenster.",en:"A graphic Express button on the left gives the console more room. The assistant shows analysis activity and offers a comparison right in the result window."},
  improvements:{de:["Original und Master direkt im Assistenten umschalten, pausieren und die Hörposition wählen. Der vorhandene Player und Autostart bleiben erhalten.","Leuchtende Ringe reagieren auf das abgespielte Audio; bei Pause ruhen sie. Reduzierte Bewegung wird berücksichtigt.","Während Upload und Analyse zeigt eine Animation die laufende Verarbeitung – ohne erfundene Prozentwerte."],en:["Switch between original and master, pause and seek directly in the assistant. Existing playback and autoplay remain available.","Glowing rings respond to the playing audio and rest when paused. Reduced-motion preferences are respected.","An animation shows processing activity during upload and analysis without invented percentages."]},
}, {
  version:"1.6.0",date:"2026-10-27",
  title:{de:"Mit Express Schritt für Schritt zum Master",en:"Step by step to your master with Express"},
  summary:{de:"Der neue Express-Assistent begleitet dich im übersichtlichen Popup durch dein Mastering. Die gewohnte Konsole bleibt erhalten.",en:"The new Express assistant guides you through mastering in a clear popup. Your familiar console stays available."},
  improvements:{de:["Song auswählen, Ziel und Klang festlegen, freiwillig Referenzen ergänzen und das Downloadformat wählen – ohne Fachwissen.","Du startest das Mastering erst nach deiner Bestätigung. Danach geht es zum Hörvergleich, Download oder zur manuellen Feinabstimmung.","Assistent und Konsole teilen sich Song und Einstellungen. Die Mastering-Routine, Klangqualität und bisherigen Funktionen bleiben unverändert."],en:["Choose your song, target and sound, optionally add references and pick your download format—no audio expertise needed.","Mastering starts only after your confirmation. Afterwards, compare, download or fine-tune manually.","The assistant and console share your song and settings. Audio processing, sound quality and existing features remain unchanged."]},
}, {
  version:"1.5.1",date:"2026-10-24",
  title:{de:"Referenz-Lab im Studio-Look",en:"Studio-style reference lab"},
  summary:{de:"Plastische Drehregler und klare Anzeigen machen die Referenzeinstellungen übersichtlicher.",en:"Dimensional dials and clear readouts make reference settings easier to navigate."},
  improvements:{de:["Großer Referenzeinfluss-Regler und drei kleinere Klangregler mit Prozentanzeigen, Tastaturbedienung und Zurücksetzen.","Referenztracks lassen sich mit schlanken Fadern gewichten. Klangberechnung und Einstellbereiche bleiben unverändert."],en:["Large reference influence dial and three smaller tonal controls with percentage readouts, keyboard support and reset.","Slim faders adjust reference weights. Audio processing and adjustment ranges remain unchanged."]},
}, {
  version:"1.5.0",date:"2026-10-24",
  title:{de:"Dein Referenzsound. Feiner abgestimmt.",en:"Your reference sound. More finely matched."},
  summary:{de:"Bis zu drei Referenzen und feinere Klangprofile helfen dir, dein gewünschtes Klangbild gezielter anzusteuern.",en:"Up to three references and finer tonal profiles help you guide your master towards the sound you want."},
  improvements:{de:["Neuer plastischer Character-Drehregler: von transparent bis druckvoll, ohne das Lautheitsziel zu ändern.","Gemessene Energiekarte mit schonender Abschnittssteuerung und verständlicher Erklärung – keine geratenen Strophen oder Refrains.","Wissen, FAQ und Ablauf erklären die aktuellen Funktionen samt Grenzen jetzt auf Deutsch und Englisch.","Die Spitzenbegrenzung berücksichtigt auch sehr kurze Spitzen am Dateiende und regelt bei dichtem Material sanfter zurück.","Der A/B-Vergleich startet mit Originalpegeln. Den Lautheitsabgleich kannst du bei Bedarf einschalten.","Ein sanfter dynamischer EQ fängt kurze Überbetonungen in Tiefmitten und Präsenz ab, ohne die Klangfarbe dauerhaft abzusenken.","Bis zu drei Referenztracks kombinieren und ihren Einfluss einzeln gewichten.","Referenzeinfluss, Bass-Wunsch, Helligkeit und Kurvenglättung getrennt einstellen. Das Plattform-Lautheitsziel bleibt unabhängig.","Aktive Audiobereiche bestimmen ein feineres Klangprofil; die zusätzliche Profil-Korrektur bleibt auf kleine, breite Eingriffe begrenzt.","Ältere gespeicherte Referenzen bleiben nutzbar. Hinweise erklären, wann eine erneute Analyse für das feinere Matching nötig ist."],en:["New dimensional character dial: from transparent to punchy without changing loudness targets.","Measured energy map with gentle section control and clear explanations—not guessed verses or choruses.","Knowledge, FAQ and workflow guides now explain current features and their limits in German and English.","Peak limiting covers very short peaks at the end of a file and recovers more gently on dense material.","The A/B comparison starts at original levels. Enable loudness matching whenever needed.","Gentle dynamic EQ catches short low-mid and presence buildups without permanently reducing the tonal balance.","Combine up to three reference tracks and weight their contributions individually.","Adjust reference influence, bass preference, brightness and curve smoothing separately. Platform loudness targets remain independent.","Active audio regions inform a finer tonal profile; additional profile correction stays small and broad.","Older saved references remain usable. Clear notices explain when a new analysis is needed for finer matching."]},
}, {
  version:"1.4.1", date:"2026-10-20",
  title:{de:"Besser geschütztes Widerrufsformular",en:"Better-protected withdrawal form"},
  summary:{de:"Das Widerrufsformular prüft automatisierte Anfragen vor dem Speichern und E-Mail-Versand, ohne externen CAPTCHA-Dienst.",en:"The withdrawal form checks automated requests before saving and sending email, without an external CAPTCHA service."},
  improvements:{de:["Eine kurze automatische Formularprüfung und zusätzliche Versandlimits erschweren Spam.","Bei Problemen mit dem Formular ist die alternative E-Mail-Adresse direkt sichtbar. Eingangsbestätigung und sichere Wiederholung bleiben erhalten."],en:["A brief automatic form check and additional submission limits help reduce spam.","An alternative email address is shown directly if the form is unavailable. Receipts and safe retries remain available."]},
}, {
  version: "1.4.0", date: "2026-10-18",
  title: { de: "Dein Audio. Passend geschnitten und geteilt.", en: "Your audio. Cut and ready to share." },
  summary: { de: "Drei neue kostenlose Tools helfen dir beim Bereinigen von Sprache, Zuschneiden und Weitergeben deiner Audiodateien – mit Vorschau und vollständigen Downloads.", en: "Three new free tools help you clean up voice recordings, trim and share audio, with audition playback and complete downloads." },
  improvements: {
    de: ["Podcast- und Sprachaufnahmen von gleichmäßigem Rauschen bereinigen, den Pegel ausgleichen und Original sowie Ergebnis vergleichen.", "WAV-Dateien ohne Anmeldung in MP3 mit 128 oder 320 kbit/s umwandeln, vorhören und herunterladen.", "Im Audio-Cutter Start und Ende an der Wellenform setzen oder genaue Zeiten eingeben und die Auswahl vorhören.", "Optional Ein-/Ausblendungen wählen und den geschnittenen Abschnitt lokal als WAV exportieren. Das Original bleibt unverändert.", "Alle drei Tools sind auf Deutsch und Englisch verfügbar und mit passenden Audio-Ratgebern verknüpft."],
    en: ["Reduce steady noise in podcast and voice recordings, even out levels and compare original and cleaned audio.", "Convert WAV files to 128 or 320 kbit/s MP3 without signing in, audition and download.", "Set start/end markers on the Audio Cutter waveform or enter precise times, then audition your selection.", "Add optional fades and export the cut section locally as WAV. Your original remains unchanged.", "All three tools are available in German and English and linked to relevant audio guides."],
  },
}, {
  version: "1.3.0", date: "2026-10-18",
  title: { de: "Klare Antworten. Ergebnisse mit Profil.", en: "Clear answers. Results in focus." },
  summary: { de: "Ein neuer Überblick erklärt kostenloses Mastering und passende nächste Schritte. Die Audio-Tools stellen ihre Ergebnisse übersichtlicher dar.", en: "A new overview explains free mastering and useful next steps. Audio tools present their results more clearly." },
  improvements: {
    de: ["Direkt auf der Startseite erfährst du, was kostenlos enthalten ist, welche Datei sich eignet und wie du nach dem Auto-Master weiterarbeitest.", "Mix-Check, Hörbeispiele und hilfreiche Ratgeber sind im neuen Überblick direkt erreichbar.", "Tool-Ergebnisse erhalten einen gemeinsamen Abschlussbereich, klarere Messwertkarten und dezente Übergänge, die reduzierte Bewegung respektieren."],
    en: ["The homepage explains what is included for free, which files to use and how to continue after automatic mastering.", "The new overview links directly to Mix Check, listening examples and practical guides.", "Tool results gain a consistent completion overview, clearer metric cards and subtle transitions that respect reduced-motion preferences."],
  },
}, {
  version: "1.2.0", date: "2026-10-18",
  title: { de: "Stimmen und Instrumente neu entdecken.", en: "Rediscover voices and instruments." },
  summary: { de: "Zwei neue Tool-Seiten führen zur Stimm- und Instrumententrennung. Die Verarbeitung steht bereit, sobald der zusätzliche Trennungsdienst aktiviert ist.", en: "Two new tool pages introduce vocal and instrument separation. Processing becomes available when the additional separation service is activated." },
  improvements: {
    de: ["Vocal Remover und Stem Separation haben eigene Seiten auf Deutsch und Englisch mit klarer Verfügbarkeitsanzeige.", "Bei aktiviertem Dienst kannst du nach Anmeldung 20 Sekunden testen; vollständige Spuren und WAV-Downloads benötigen eine Freischaltung.", "Die Vorschau erklärt Grenzen der Trennung, Tageslimits und die Aufbewahrung deiner Ergebnisse."],
    en: ["Vocal Remover and Stem Separation have dedicated German and English pages with clear availability information.", "When the service is active, signed-in users can try 20 seconds; full stems and WAV downloads require activation.", "The preview explains separation limitations, daily limits and how long your results remain available."],
  },
}, {
  version: "1.1.0", date: "2026-10-18",
  title: { de: "Mehr Rhythmus. Neue Perspektiven.", en: "More rhythm. Fresh perspectives." },
  summary: { de: "Deutlichere Musikimpulse und wechselnde Cover bringen mehr Leben in die Hörbeispiele. Der Anbieter-Vergleich erklärt den heutigen Funktionsumfang.", en: "Stronger musical pulses and changing artwork bring the listening examples to life. The provider comparison explains today's feature set." },
  improvements: {
    de: ["Die Hintergrundringe schlagen auf kurze Musikimpulse deutlicher aus und klingen schnell wieder ab.", "Zehn Covermotive werden bei neuen Seitenaufrufen zufällig verteilt – auch für einen späteren fünften Hörbeispiel-Track.", "Der Vergleich mit anderen Mastering-Angeboten beschreibt jetzt Live-Feinabstimmung, Downloads und die aktuellen Audio-Tools auf Deutsch und Englisch."],
    en: ["Background rings respond more clearly to short musical impulses and settle quickly afterwards.", "Ten cover designs are randomly assigned on new page visits, including support for a future fifth listening track.", "The comparison with other mastering services now covers live fine-tuning, downloads and current audio tools in German and English."],
  },
}, {
  version: "1.0.0", date: "2026-10-18",
  title: { de: "Beatzucker 1.0 – bereit für deine Musik.", en: "Beatzucker 1.0 – ready for your music." },
  summary: { de: "Beatzucker verlässt die Beta-Phase. Verständlichere Ratgeber und gezielte Stereo-Hilfen begleiten dich vom Export bis zum nächsten Mixschritt.", en: "Beatzucker leaves beta. Clearer guides and focused stereo advice help you from export to your next mixing decision." },
  improvements: {
    de: ["Die erste Vollversion trägt die Versionsnummer 1.0.0 – ohne Beta-Zusatz.", "LUFS, Sample-Rate, Bittiefe und Dither mit konkreten Beispielen verstehen und direkt ausprobieren.", "Das Stereo-Labor erklärt deine Messwerte und schlägt passende Prüfungen im Mix vor – ohne pauschale Klangurteile.", "Die Hörbeispiele erhalten eigene Covermotive, direkte Original-/Master-Umschaltung und Hintergrundkonturen, die auf die abgespielte Musik reagieren."],
    en: ["The first full release is version 1.0.0, without the beta label.", "Understand LUFS, sample rate, bit depth and dither with concrete examples and linked tools.", "The Stereo Lab explains your measurements and suggests relevant mix checks without blanket quality judgements.", "Listening examples gain original cover artwork, direct original/master switching and background contours that react to the music being played."],
  },
}, {
  version: "0.21.0", date: "2026-10-18",
  title: { de: "Hören. Vergleichen. Besser einordnen.", en: "Listen. Compare. Understand." },
  summary: { de: "Eine eigene Hörvergleichsseite verbindet echte Original-/Master-Hörproben mit verständlichen Erklärungen und Messwerten.", en: "A dedicated listening page brings real original/master excerpts together with clear explanations and measurements." },
  improvements: {
    de: ["Original und Master auf einer eigenen Seite vergleichen – auch ohne Anmeldung.", "Hörhinweise erklären Lautheitsabgleich, Klangbalance und die Grenzen einzelner Messwerte.", "Passende Ratgeber und Tools sind direkt verknüpft; alle Inhalte sind auf Deutsch und Englisch verfügbar."],
    en: ["Compare original mixes and masters on a dedicated page without signing in.", "Listening guidance explains loudness matching, tonal balance and the limits of individual measurements.", "Relevant guides and tools are linked directly, with complete German and English versions."],
  },
}, {
  "version": "0.20.0",
  "date": "2026-10-17",
  "title": {
    "de": "Mehr Klangskulptur. Weniger Rahmen.",
    "en": "More sound sculpture. Less framing."
  },
  "summary": {
    "de": "Eine offene Klangskulptur begleitet deinen fertigen Master. Die Oberfläche und die Hörvergleiche bleiben übersichtlich.",
    "en": "An open sound sculpture accompanies your finished master, with a clearer interface and listening comparisons."
  },
  "improvements": {
    "de": [
      "Die neue Master-Übersicht zeigt deinen Track und echte Messwerte neben einer schwebenden Klangskulptur.",
      "Kein innerer Scrollbalken mehr: Auf kleineren Bildschirmen scrollt die Übersicht mit der Seite.",
      "Der Tageszähler bleibt beim Aufräumen deiner Bibliothek korrekt."
    ],
    "en": [
      "The new master overview pairs your track and real measurements with a floating sound sculpture.",
      "No more inner scrollbar: the overview scrolls with the page on smaller screens.",
      "Your daily usage stays accurate when you tidy your library."
    ]
  }
}, {
  "version": "0.19.0",
  "date": "2026-10-17",
  "title": {
    "de": "Die ganze Kette im Blick.",
    "en": "See the complete chain."
  },
  "summary": {
    "de": "Das Mastering-Fenster zeigt alle zwölf Verarbeitungsstufen mit passenden Animationen. Nach dem Mastering ergänzt eine kompakte Übersicht den linken Seitenbereich.",
    "en": "The mastering window shows all twelve processing stages with matching animations. A compact overview fills the left-hand area after mastering."
  },
  "improvements": {
    "de": [
      "Alle zwölf Bearbeitungsstufen sind im Mastering-Fenster sichtbar, jeweils mit passender Animation.",
      "Nicht benötigte Stufen sind klar gekennzeichnet.",
      "Nach dem Mastering zeigt die linke Spalte deinen Track und die gemessenen Lautheitswerte."
    ],
    "en": [
      "All twelve processing stages appear in the mastering window, with matching animations.",
      "Stages that are not applied are clearly marked.",
      "After mastering, the left column shows your track and measured loudness."
    ]
  }
}, {
  "version": "0.18.0",
  "date": "2026-10-17",
  "title": {
    "de": "Dein Master nimmt Gestalt an.",
    "en": "Watch your master take shape."
  },
  "summary": {
    "de": "Ein animierter Klangkern begleitet das Mastering. Upload, Abschluss und Hörvergleich erhalten ruhigere, aufeinander abgestimmte Übergänge. Ein direkter Download-Sprung führt vom Player zu den Formaten. Die Klangbearbeitung bleibt unverändert.",
    "en": "An animated sound core accompanies mastering. Upload, completion and listening comparison receive subtle, coordinated transitions. A direct download shortcut leads from the player to the available formats. Audio processing remains unchanged."
  },
  "improvements": {
    "de": [
      "Ein schwebender Klangkern begleitet die Fortschrittsanzeige.",
      "Upload und Abschluss bekommen dezente visuelle Rückmeldungen.",
      "Original und Master lassen sich über deutlichere A/B-Buttons vergleichen. Ein direkter Button führt zum Download."
    ],
    "en": [
      "A floating sound core accompanies the progress display.",
      "Upload and completion provide subtle visual feedback.",
      "Clearer A/B buttons switch between original and master, with a direct shortcut to downloads."
    ]
  }
}, {
  "version": "0.16.0",
  "date": "2026-10-17",
  "title": {
    "de": "Mehr hören. Zuverlässiger weiterarbeiten.",
    "en": "More to hear. Smoother consecutive masters."
  },
  "summary": {
    "de": "Mehr echte Hörbeispiele und zuverlässigeres Mastering mehrerer Songs nacheinander.",
    "en": "More real listening examples and more reliable consecutive mastering."
  },
  "improvements": {
    "de": [
      "Lass mich nicht allein und On Tour ergänzen die Hörvergleiche.",
      "MP3-Exporte gelingen bei schwierigen Tracks zuverlässiger.",
      "Trackwechsel und aufeinanderfolgende Masterings sind besser abgesichert. Bei hoher Auslastung erscheinen klarere Hinweise."
    ],
    "en": [
      "Lass mich nicht allein and On Tour join the listening comparisons.",
      "MP3 exports are more reliable with challenging tracks.",
      "Track changes and consecutive masters work more reliably, with clearer messages when the service is busy."
    ]
  }
}, {
  "version": "0.15.0",
  "date": "2026-10-17",
  "title": {
    "de": "Echte Hörproben. Klare Vergleiche.",
    "en": "Real audio. Clear comparisons."
  },
  "summary": {
    "de": "Zwei echte Tracks lassen sich auf der Startseite vor und nach dem Mastering anhören – mit wählbarem Lautheitsabgleich. Aktuelle Ratgeber und passendere Linkvorschauen ergänzen das Update.",
    "en": "Listen to two real tracks before and after mastering on the homepage, with optional loudness matching. Updated guidance and more relevant link previews complete the update."
  },
  "improvements": {
    "de": [
      "Xplore Belgium und Back to My Acid lassen sich als Original und Master an derselben Stelle vergleichen. Lautheitsabgleich ist optional.",
      "Die Hörproben zeigen echte Wellenformen und gemessene Werte.",
      "Ratgeber zur manuellen Bearbeitung sind aktualisiert. Geteilte Links zeigen passendere Vorschauen."
    ],
    "en": [
      "Compare Xplore Belgium and Back to My Acid as original and master at the same position, with optional loudness matching.",
      "Listening examples show actual waveforms and measured values.",
      "Manual-mastering guides are updated, with more relevant previews for shared links."
    ]
  }
}, {
  "version": "0.14.1",
  "date": "2026-10-17",
  "title": {
    "de": "Flüssiger manuell vorhören.",
    "en": "Smoother manual previews."
  },
  "summary": {
    "de": "Die manuelle Vorschau lädt den gewählten Ausschnitt vor und wiederholt ihn aus dem Speicher. Die Live-Effekte benötigen weniger Rechenarbeit.",
    "en": "Manual preview preloads the selected section and loops it from memory. Live effects require less processing."
  },
  "improvements": {
    "de": [
      "Die manuelle Vorschau wiederholt den gewählten Ausschnitt flüssiger.",
      "Beim Laden wird der Fortschritt angezeigt; Bereichswechsel starten keine alte Auswahl."
    ],
    "en": [
      "Manual preview loops the selected section more smoothly.",
      "Loading progress is visible, and changing sections cannot start an old selection."
    ]
  }
}, {
  "version": "0.14.0",
  "date": "2026-10-17",
  "title": {
    "de": "Gezielter bearbeiten. Genauer vorhören.",
    "en": "More focused processing. Closer previews."
  },
  "summary": {
    "de": "Die automatische Klangbearbeitung arbeitet zurückhaltender mit bereits dichten Mischungen. Die manuelle Vorschau wurde genauer.",
    "en": "Automatic processing treats already dense mixes more gently, with more accurate manual previews."
  },
  "improvements": {
    "de": [
      "Ausgewogenere Bearbeitung von Bass, Höhen und Dynamik.",
      "Das Bass-Stereobild bleibt erhalten, wenn kein Eingriff vorgesehen ist. Die manuelle Feinabstimmung gibt dir zusätzliche Kontrolle.",
      "Ein kurzer Kontrollrender hilft dir, manuelle Einstellungen vor dem vollständigen Export zu prüfen."
    ],
    "en": [
      "More balanced processing of bass, treble and dynamics.",
      "Bass stereo is preserved when no change is needed, with additional control in manual fine-tuning.",
      "A short control render helps you check manual settings before a full export."
    ]
  }
}, {
  "version": "0.12.0",
  "date": "2026-10-12",
  "title": {
    "de": "Vom Messwert zum nächsten Schritt.",
    "en": "From measurements to your next step."
  },
  "summary": {
    "de": "Praxisbeispiele und passende Ratgeber helfen dir, Tool-Ergebnisse einzuordnen. Die Bibliothek lässt sich mit Mehrfachauswahl leichter aufräumen.",
    "en": "Practical examples and matching guides help you interpret tool results. Multi-select makes your library easier to organize."
  },
  "improvements": {
    "de": [
      "Praxisbeispiele und passende Ratgeber helfen dir, Analyseergebnisse besser einzuordnen.",
      "Die Tools schlagen nach der Analyse sinnvolle nächste Schritte vor.",
      "In der Bibliothek lassen sich mehrere abgeschlossene Einträge gemeinsam löschen."
    ],
    "en": [
      "Practical examples and matching guides help you interpret analysis results.",
      "Tools suggest useful next steps after analysis.",
      "Select and delete several finished library entries together."
    ]
  }
}, {
  "version": "0.11.0",
  "date": "2026-10-11",
  "title": {
    "de": "Audio-Tools mit verlässlicheren Ergebnissen.",
    "en": "Audio tools with more reliable results."
  },
  "summary": {
    "de": "Unsere Audio-Tools zeigen Grenzen und fehlende Messungen klarer. Vergleiche, Live-Bearbeitung und Exporte wurden überarbeitet; Deutsch und Englisch lassen sich direkt im Tool wechseln.",
    "en": "Our audio tools explain limitations and missing measurements more clearly. Comparisons, live processing and exports have been improved, with a direct German/English switch in each tool."
  },
  "improvements": {
    "de": [
      "Vocal Chain, Referenzvergleich und Streaming-Vorschau wurden verbessert.",
      "Kick-/Bass- und Stereo-Checks geben klarere Hinweise bei Stille oder fehlenden Messwerten.",
      "Album-Checks können fehlende Ergebnisse erneut prüfen. Schnittpunkte lassen sich direkt an der Wellenform verschieben.",
      "Deutsch und Englisch lassen sich direkt im Tool wechseln."
    ],
    "en": [
      "Vocal Chain, reference comparison and streaming previews have been improved.",
      "Kick/bass and stereo checks give clearer guidance for silence or missing measurements.",
      "Album checks can retry missing results, and trim points can be dragged directly on the waveform.",
      "Switch between German and English within each tool."
    ]
  }
}, {
  "version": "0.10.0",
  "date": "2026-10-11",
  "title": {
    "de": "Flüssigere Tools. Zuverlässigere Verarbeitung.",
    "en": "Smoother tools. More reliable processing."
  },
  "summary": {
    "de": "Die Tools lassen sich während der Verarbeitung flüssiger bedienen. Vorschauen und Loop-Auswahl funktionieren zuverlässiger.",
    "en": "Tools remain smoother to use while processing, with more reliable previews and loop selection."
  },
  "improvements": {
    "de": [
      "Die Oberfläche bleibt während aufwendiger Analysen und Exporte besser bedienbar.",
      "Manuelle Loop-Auswahl und Wiedergabe am Dateiende wurden verbessert.",
      "Anmeldung und Profil sind auch auf Englisch nutzbar. Fehlende Messwerte werden klar gekennzeichnet."
    ],
    "en": [
      "The interface stays more responsive during complex analyses and exports.",
      "Manual loop selection and playback at the end of a file work more reliably.",
      "Sign-in and profile are available in English, and missing measurements are clearly marked."
    ]
  }
}, {
  "version": "0.9.1",
  "date": "2026-10-11",
  "title": {
    "de": "Mehr Kontoschutz. Genauere Audio-Ergebnisse.",
    "en": "Safer accounts. More accurate audio results."
  },
  "summary": {
    "de": "Wichtige Kontoänderungen werden besser geschützt. Beim Kürzen und Normalisieren zeigen wir dir die gemessenen Werte des fertigen Ergebnisses.",
    "en": "Important account changes are better protected. Trimming and normalization now show the measured values of the finished result."
  },
  "improvements": {
    "de": [
      "Der Trimmer zeigt die erreichte Lautheit und den Spitzenpegel des fertigen Ausschnitts.",
      "Unter „So funktioniert’s“ wird die manuelle Feinabstimmung verständlicher erklärt.",
      "Wichtige Kontoänderungen und die Kontolöschung verlangen eine erneute Bestätigung."
    ],
    "en": [
      "The trimmer shows the achieved loudness and peak level of the finished section.",
      "How it works explains manual fine-tuning more clearly.",
      "Important account changes and account deletion require renewed confirmation."
    ]
  }
}, {
  "version": "0.9.0",
  "date": "2026-10-11",
  "title": {
    "de": "Zuverlässiger arbeiten. Entspannter hören.",
    "en": "More reliable tools. Smoother listening."
  },
  "summary": {
    "de": "Dieses Update verbessert die Sicherheit deines Kontos, die Audiovorschau und den Umgang mit deinen fertigen Masters.",
    "en": "This update improves account security, audio previews and the handling of your finished masters."
  },
  "improvements": {
    "de": [
      "Audiovorschauen funktionieren nach Exporten und Streaming-Vergleichen zuverlässiger.",
      "Unterbrochene Aufträge blockieren dein Konto nicht dauerhaft.",
      "Eine neue Unterstützungsseite erklärt das kostenlose Projekt. Version und Verbesserungen sind auf einer eigenen Seite sichtbar."
    ],
    "en": [
      "Audio previews work more reliably after exports and streaming comparisons.",
      "Interrupted jobs no longer block your account indefinitely.",
      "A new support page explains the free project, with a dedicated page for versions and improvements."
    ]
  }
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
  "version": "0.6.0",
  "date": "2026-08-19",
  "retrospective": true,
  "title": {
    "de": "Drehen. Hören. Feinabstimmen.",
    "en": "Adjust. Listen. Fine-tune."
  },
  "summary": {
    "de": "Manuelle Klangkorrekturen werden während der Wiedergabe hörbar – ohne für jede Änderung neu rendern zu müssen.",
    "en": "Hear manual sound adjustments during playback without rendering every individual change."
  },
  "improvements": {
    "de": [
      "Manuelle Änderungen sind direkt in der Audiovorschau hörbar.",
      "Regler und Ausschnitt-Wiedergabe wurden flüssiger.",
      "Deine Feinabstimmung kann in einen neuen Master übernommen werden."
    ],
    "en": [
      "Hear manual changes directly in the audio preview.",
      "Smoother controls and section playback.",
      "Apply your fine-tuned settings to a new master."
    ]
  }
}, {
  "version": "0.5.0",
  "date": "2026-08-18",
  "retrospective": true,
  "title": {
    "de": "Mehr Kontrolle über deinen Sound",
    "en": "More control over your sound"
  },
  "summary": {
    "de": "Die automatische Bearbeitung wurde genauer abgestimmt und um manuelle Nachjustierung ergänzt.",
    "en": "Automatic processing was refined and extended with manual adjustments."
  },
  "improvements": {
    "de": [
      "Manuelle Nachbearbeitung ergänzt das automatische Mastering.",
      "Lautheit und Dynamik wurden verbessert.",
      "Die Fortschrittsanzeige folgt den tatsächlichen Bearbeitungsschritten."
    ],
    "en": [
      "Manual adjustments complement automatic mastering.",
      "Improved loudness and dynamics processing.",
      "Progress follows actual processing steps."
    ]
  }
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
