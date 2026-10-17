# Hörvergleich und Mastering-Stabilität – vorbereitet für 0.16.0

Noch nicht deployed. Version, Logoquelle und öffentliche DE/EN-Historie sind vorbereitet.

## Dritter echter Hörvergleich

Reihenfolge: Lass mich nicht allein → Back to My Acid → On Tour → Xplore Belgium.

Nach zusätzlicher ausdrücklicher Freigabe ergänzt On Tour den öffentlichen Vergleich an dritter Stelle. Verwendet wird der erfolgreich geprüfte lokale Pop-Master (Club −9 LUFS, 65 %, MP3 320), nicht das fehlgeschlagene Ergebnis. Auch hier nur 24 Sekunden (0:48–1:12), gleiche Encoder-Einstellungen/Randblenden und keine zusätzliche Klangbearbeitung; Originalpegel bleibt Standard. Neue eigene blaue Kachel; DE/EN zeigen vier Songs und acht AudioObjects. Bestehende sechs MP3-Dateien unverändert.

On Tour: Original/Master −16.83/−10.88 LUFS, −6.26/−1.25 dBTP, Crest 12.87/12.27 dB. Breitband-Ankerkorrelation 0.6241 reicht wegen der unterschiedlichen Signalphase/Klangbalance nicht für die bisherige Einzelankerprüfung. Zwei unabhängige, ausschließlich zur Ausrichtungsanalyse auf 1 kHz begrenzte Fenster ergeben 0.6910/0.6937 bei +336/+264 Samples; Differenz 1.5 ms. Median +300 Samples (6.25 ms) zur Ausrichtung verwendet. Veröffentlichte Audio-Dateien NICHT tiefpassgefiltert; keine Behauptung vollständiger Phasengleichheit. Alle Details/SHA-256-Quellen bleiben in der privaten Provenienzdatei.

- Neue Quellen sind die ausdrücklich bereitgestellte Original-WAV und die MP3-Datei mit `beatzucker` im Dateinamen. Quelldateien unverändert.
- Veröffentlichung nur als 24-Sekunden-Ausschnitte, 0:48–1:12 im Original. Master um +304 Samples bei 48 kHz ausgerichtet; Ankerkorrelation 0.6728. Keine Behauptung vollständiger Phasengleichheit nach dem Mastering.
- Beide Seiten MP3 320 kbit/s, Stereo, 48 kHz, identische 12-ms-Randblenden. Kein erneutes Mastering, keine zusätzliche Klangkorrektur, keine eingebrannte Lautheitsnormalisierung. Masterquelle ist bereits verlustbehaftet; die Erklärung hierzu bleibt DE/EN sichtbar.
- Neue gemessene Ausschnittswerte Original/Master: −15.46/−12.58 LUFS, −4.32/−1.69 dBTP, Crest 12.72/12.68 dB. Je Datei 961,964 Bytes, Wellenformen aus den tatsächlich bereitgestellten Dateien.
- Originalpegel bleibt voreingestellt. Lautheitsabgleich ist freiwillig und nur absenkend. Die anderen vier Audiodateien wurden nicht neu erzeugt oder verändert.
- Eigene mintfarbene Kachel; Farben und Hörhinweise sind jetzt an Track-IDs statt an die bisherige Zweier-Reihenfolge gebunden. Anzahl und strukturierte Audiodaten umfassen drei Paare auf Deutsch und Englisch.

## Gefundene Schwachstellen und Korrekturen

1. Startknopf/Shortcut konnten vor einem React-Zustandswechsel mehrfach auslösen. Der gemeinsame Workspace besitzt jetzt einen synchronen Auftragsschutz für Auto- und manuelles Mastering. Der kurz darauf ausgeblendete Knopf besitzt nicht mehr die Anfrage.
2. Ein einfaches Boolean schützte nicht zuverlässig gegen alte Antworten, sobald ein neuer Auftrag lief. Jeder Lauf erhält jetzt einen eigenen Controller und eine Identitätsprüfung. Reset/Trackwechsel invalidiert alte Antworten; ein alter Abschluss kann keinen neuen Lauf entsperren.
3. Bei einem neuen Upload blieben teilweise alte Analyse-/Ergebniszustände erhalten. Diese werden zurückgesetzt. Reset beendet alte Upload-/Analyse-Anfragen und deren Fortschritts-Timer. Ungültige Uploadantworten und Upload-Zeitüberschreitungen werden abgefangen.
4. SSE-Leser wurden bei terminalen Ereignissen vorzeitig verlassen, ohne sie ausdrücklich freizugeben. Browser und Next.js beenden/freigeben jetzt ihre jeweiligen Leser. Python gibt einen fertigen DSP-Platz bereits vor dem finalen Ereignis frei, nicht erst beim Weiterlaufen/Schließen des Generators.
5. Die vollständige Fertigmeldung an den Browser wartete auf den externen Mailversand. Der DB-Abschluss bleibt vor der Ergebnisfreigabe; die anschließende Mail blockiert das fertige Ergebnis nicht mehr. Mailfehler bleiben protokolliert.
6. Kommentar-Heartbeats halten die Verbindung auch während Admission/Ergebnisprüfung offen; keine erfundenen Fortschrittswerte. Fehler enthalten eine Referenz zum protokollierten Auftrag. Speicher-, Kapazitäts-, Timeout-, Upload- und bereits-aktiver-Auftrag-Hinweise sind verständlicher und zweisprachig. Interne Dateipfade/Serviceantworten gelangen nicht mehr als Fehlermeldung zum Nutzer.
7. Standard-DSP-Parallelität von zwei auf einen Auftrag reduziert: geringere gleichzeitige Speicherspitzen auf dem kleinen Produktionshost. **Abwägung:** Unter mehreren Nutzern mehr Wartezeit bzw. explizite Auslastungsmeldung, keine Änderung von Audioqualität, Abtastrate oder Export. Ein ausdrücklich gesetztes `MAX_CONCURRENT_DSP_JOBS` hat weiterhin Vorrang. Bestehende begrenzte Warteschlange bleibt erhalten; keine automatische Wiederholung möglicherweise bereits gestarteter Masterings.
   Bei einer eindeutigen Ablehnung vor Arbeitsbeginn (HTTP 503 mit Retry-After) warten Analyse und interne Master-Annahme begrenzt und versuchen die Annahme höchstens zweimal erneut. Akzeptierte Aufträge, Verbindungsfehler mit unbekanntem Arbeitsstatus und DSP-Fehler werden niemals automatisch neu gestartet. Abbruch beendet auch den Wartetimer; die Oberfläche unterscheidet Warten von Bearbeitung.
8. Alte A/B-Blob-/Wellenform-Anfragen werden bei Quellwechsel abgebrochen. Auch nach verspäteter Antwort dürfen sie keinen alten Blob oder alte Wellenformen einsetzen. Temporäre AudioContexts schließen auch bei Decoderfehlern. Reset stoppt alte Wiedergabe; verzögerter Auto-Start wird beim Wechsel aufgeräumt.

9. Der nachgelieferte Song On Tour reproduzierte den entscheidenden Fehler: Auto erfolgreich, Pop bei Club −9 LUFS/65 %/MP3 320 scheitert in `master_audio` mit `mp3320 true peak remains above ceiling after safety render`. Nicht die Kombination ist ungültig: Die bisher einzige MP3-Sicherheitskorrektur reicht hier nicht. Die Exportkontrolle erlaubt nun maximal drei gemessene, kleine Pegelkorrekturen mit zunehmendem Sicherheitsspielraum. Auslöser, bisherige Erfolgstoleranzen und erste Korrektur bleiben gleich; die True-Peak-Grenze wird nicht gelockert. Nicht konvergierende oder ungültige Ergebnisse werden weiterhin abgewiesen. Jede erneute Codierung nutzt den bearbeiteten PCM-Ausgangspunkt, nicht die zuvor erzeugte MP3. Kein erneutes EQ/Kompressions-/Limiter-Durchlaufen. Nicht mehr benötigte volle Audiodaten werden vor der Abschlussanalyse freigegeben.

**Unverändert:** `python/ai_params.py`, EQ-/Kompressions-/Stereo-/Sättigungs-/Limiter-Routine, Messverfahren, Dither und Codec/Bitrate. `python/mastering.py` enthält ausschließlich die gezielte Export-Sicherheitskorrektur und Speicherfreigabe; kein Qualitätsmodus wurde herabgesetzt. Kein DB-Schemawechsel.

## Prüfungen

- Gesamte lokale Audit-Suite, jetzt **85 Python-Tests**, sowie Offline-DSP-Selbsttest (Analyse, Mastering, WAV24, True Peak, MP3, AAC) erfolgreich. Sechs zusätzliche Export-Sicherheitsprüfungen: sichere Dateien unverändert, bisherige Einzelkorrektur gleich, zusätzliche Codecspitzen korrigiert, Schleife begrenzt, ungültige Messwerte und fehlende Exporte abgewiesen.
- Sechs neue Orchestrierungs-Testgruppen: Doppelstart, alte Antworten, Leserfreigabe, sofortiger zweiter Master trotz absichtlich dauerhaft wartendem Mailversand, Kapazitätsfehler mit anschließend erfolgreichem neuen Auftrag, ausschließlich begrenzte Admission-Wiederholungen samt Abbruch und Ausschluss doppelt gestarteter Jobs.
- Zwei ausführende Audio-Provider-Lifecycle-Testgruppen mit deterministischen Hooks und verspäteten Fetches: keine alten Blobs/Wellenformen; Contexts schließen auch nach Decoderfehlern. Kein Ersatz für einen echten Chrome-Klick-/Hörtest.
- Python-Endpunkttest lässt Generatoren bewusst am Abschluss stehen und startet drei Aufträge nacheinander: DSP-Platz und aktive ID sind jeweils bereits freigegeben. Speicherfehler-Test prüft Ursache und Freigabe.
- Echter isolierter HTTP-Test über die tatsächliche Client-SSE-Funktion, eigene SQLite-Datenbank und deaktivierten Mailversand:
  - Vollständige WAV16/Stereo/48-kHz-Originale: Lass mich nicht allein (172.32 s), Back to My Acid (187.20 s).
  - Auto A, sofort Auto B, anschließend manueller Neu-Master B mit Bass-/EQ-Anpassung; keine Pause/Seitenaktualisierung zwischen Starts.
  - Laufzeiten lokal etwa 42.6 / 52.1 / 63.3 s; True Peaks −1.00 / −1.00 / −1.69 dBTP. Keine Zusage für Serverlaufzeiten.
  - Drei unterschiedliche Abschluss-IDs, jeweils richtige Upload-Zuordnung, `done` vor Rückgabe, alle WAV24-Downloads erfolgreich und keine offenen `processing`-Einträge.
- Zusätzlicher vollständiger HTTP-Durchlauf mit genau Club −9 LUFS, Pop, 65 %, MP3 320: beide Originale automatisch, danach manueller Neu-Master von Back to My Acid. Alle drei erfolgreich, Downloads vorhanden, keine offenen Einträge. Ziel/Genre/Ausgabe zusätzlich in der isolierten DB überprüft. Gemessene Ausgaben: −11.32/−11.39/−10.52 LUFS und −1.12/−0.93/−1.01 dBTP. Das Lautheitsziel ist bewusst kein Zwang: bestehender Dynamikschutz kann eine leisere Ausgabe liefern, ohne einen Fehler auszulösen.
- Ein gleichzeitig gestarteter separater Analyse-Smoke-Test erhielt erwartungsgemäß 503, während die einzige DSP-Kapazität belegt war. Dies war ein überlappender Belastungstest, kein Klangketten-Abbruch. Die Wartelogik oben behandelt solche eindeutigen Admission-Ablehnungen. Nach Ende aller langen Jobs lief der kurze Audio-Smoke-Test mit sechs Prüfungen erfolgreich: Anmeldung/Schutz, signierte Analyse, Auto-Master/WAV-Download, manueller Neu-Master/WAV-Download, gepufferter Vorhör-Ausschnitt und Server-Kontrollrender ohne zusätzlichen Master-/Kontingenteintrag.
- Zunächst acht echte lokale Hörvergleich-HTTP-Prüfungen erfolgreich; nach dem On-Tour-Nachtrag alle zehn erweiterten Prüfungen erfolgreich: DE/EN-Seiten, acht MP3-Dateien/AudioObjects, MIME und Byte-Range-Antworten. 72 öffentliche SEO-Seitenprüfungen im vorausgehenden Stand erfolgreich.
- TypeScript und Produktionsbuild einschließlich Frontend-Lifecycle- und Admission-Wartelogik erfolgreich.

## Einordnung des Nutzer-Logs / verbleibende Live-Prüfung

Der gelieferte Produktionsauszug enthält erfolgreiche Health-Abfragen und wiederholt `Server Reference ID ... Received "x"`, aber keinen konkreten DSP-Traceback oder fehlgeschlagenen Master-Auftrag. Aus diesem Auszug allein war die Ursache nicht feststellbar. Erst die nachgelieferte Quelldatei ermöglichte die eindeutige lokale Reproduktion des unten beschriebenen Pop-/MP3-Fehlers. Die allgemeinen Ablaufprobleme wurden unabhängig davon abgesichert; keine Garantie, dass jeder externe/OOM-bedingte Fehler verschwunden ist.

Nachträglicher Nutzerhinweis: Bei 65 %/MP3 320 funktioniere Auto, Pop sei mindestens zehnmal gescheitert. Dafür wurde zunächst `On Tour.wav` (212.20 s, Stereo, 48 kHz, WAV16) als privates QA-Material bereitgestellt. Erst anschließend bat der Nutzer ausdrücklich um Aufnahme als kurzen öffentlichen Hörvergleich (siehe oben). Auf demselben Upload wurde Auto erfolgreich und Pop mit genau dem oben beschriebenen Exportfehler reproduziert. Das bestätigt einen spezifischen Fehler unabhängig von den allgemeinen Ablaufabsicherungen.

Der erneute vollständige HTTP-Durchlauf nach Korrektur ist erfolgreich: **Auto → Pop → Pop**, derselbe Upload, Club −9 LUFS, 65 %, MP3 320, ohne Pause zwischen den Aufträgen. Drei Downloads vorhanden, kein offener `processing`-Eintrag. Lokale Master-Laufzeiten etwa 55.1/64.8/65.6 s.

- Auto-MP3 vor/nach Korrektur **byteidentisch** (SHA-256 `e543dfec28faf626e3d64cd85aaade599ec8276fc9067c88094468dab3ac06f5`). Das belegt für diesen bisherigen Erfolgsfall, dass keine zusätzliche Klangbearbeitung/Absenkung eingeführt wurde.
- Beide Pop-Ergebnisse ebenfalls **byteidentisch** (SHA-256 `8269d1be45f1b06ce4c7887da7c9c7c4a591d6ddb20d6f4958439fc3867d6e89`). Je −10.5353 LUFS, −1.0490 dBTP. Insgesamt −0.64 dB Codec-Sicherheitsabsenkung in zwei Korrekturdurchläufen. Genau der zweite Korrekturdurchlauf fehlte bisher.
- Ziel-LUFS, tatsächlich eingesetztes Genre und Ausgabeformat in der isolierten DB zusätzlich geprüft. Die unter dem nominellen −9-LUFS-Ziel liegende Lautheit wird nicht nach oben erzwungen; der bestehende Dynamik-/Spitzenschutz bleibt aktiv.

Die Next.js-Meldung betrifft eine ungültige Server-Action-Kennung. Der Mastering-Client nutzt dagegen `/api/master` mit JSON/SSE und ohne Action-Kennung. Das installierte Next.js verwirft eine solche Kennung bereits im Manifest-Resolver. Automatisierte Scans sind eine mögliche Erklärung, kein aus diesem Log bewiesener Angreifer oder erfolgreicher Angriff. Auch [Next.js dokumentiert diese Unterscheidung](https://nextjs.org/docs/messages/failed-to-find-server-action).

Nach autorisiertem Deployment:

- Effektive DSP-Kapazität prüfen, falls eine alte Umgebungsvariable den neuen Einser-Standard überschreibt.
- In Chrome mit zwei verschiedenen Songs nacheinander Upload → Analyse → Auto-Master → A/B → manueller Neu-Master → Download testen; auch „Neue Datei“ während einer Analyse prüfen.
- Bei erneutem Fehler genaue Uhrzeit/Referenz und `sudo docker logs --since 15m --tail 120 beatzucker` sichern; bei Prozessneustart zusätzlich OOM-/Restart-Status lesen. Keine Passwörter/.env veröffentlichen.
- Keine Produktionsdateien, Serverkonfiguration oder fremde Container wurden durch die lokalen Tests verändert.
