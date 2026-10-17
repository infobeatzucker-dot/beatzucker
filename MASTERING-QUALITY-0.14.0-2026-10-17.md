# Mastering-Qualität A–E – vorbereitet für 0.14.0

Stand 17.10.2026. Lokal umgesetzt und technisch geprüft, nicht deployed.
SEO-Erweiterungen aus dem vorangegangenen Vorschlag sind nicht Teil dieses Auftrags.

## A. Korrekte Bassweiche

Die untere Begrenzung von 1 % der Nyquist-Frequenz wurde durch eine Begrenzung in Hz ersetzt. Eine 80-Hz-Weiche bleibt damit bei 80 Hz statt 220,5/240/480 Hz bei 44,1/48/96 kHz. Unzulässige Frequenzen oberhalb Nyquist werden weiterhin begrenzt.

Neue Tests prüfen den −6,0206-dB-Punkt bei 80 Hz mit 8/44,1/48/96/192 kHz. Das ist eine Korrektur realer Bandzuordnung, kein zusätzliches Effektmodul.

## B. Vollständige Rekonstruktion

Die früheren Zweige erhalten den Allpass-Phasengang späterer LR4-Weichen. Damit hat die vollständige Vierband-Summe bei deaktivierter Kompression einen flachen Amplitudengang. Der De-Esser erhält denselben Phasenausgleich für seinen unteren Zweig.

Messung bei 48 kHz mit leisen, stationären Testtönen und 1:1-Verhältnissen:

| Fall | Vorher | Nachher |
| --- | ---: | ---: |
| Vierband-Summe, 300 Hz | ca. −3,316 dB | 0,000 dB |
| De-Esser-Summe, 6 kHz | ca. −1,803 dB | ca. −0,000001 dB |

Zusätzliche Impuls-/FFT-Tests prüfen die vollständige Summe über den Frequenzbereich, nicht nur das Gesamt-RMS eines einzelnen Zweiwege-Splits. Eine Allpass-Rekonstruktion ist nicht phasenlinear und nicht sample-identisch zum Eingang; flacher Amplitudengang wird nicht als Nulltest ausgegeben.

## C. Pegelunabhängige Entscheidungen

- Subbass-Referenzvergleich nutzt Sub/Mitten-Verhältnisse. Fehlende Referenzbänder führen nicht zu erfundenen Zielwerten.
- Ein höherer Kompressionsbedarf senkt die Sub-Schwelle, statt sie widersprüchlich anzuheben.
- Zusätzlicher Air-EQ wird aus Air/Höhen-Balance und spektralem Schwerpunkt abgeleitet, nicht aus dem absoluten Pegel des Uploads. Der effektive Zusatzgain ist Teil der zurückgegebenen Parameter.
- Tests ändern Quell-/Referenzpegel unabhängig voneinander; bei gleichen spektralen und dynamischen Eigenschaften bleiben sämtliche berechneten Parameter identisch.

## D. Vorschau und Export

- Live-De-Esser, korrigierte Vierband-Weiche, Allpass-Kompensation, Stereo-Verkopplung, Reduction-Caps, Soft Knee und dynamikabhängige Release-Skalierung laufen jetzt als eigene AudioWorklet-Dynamik statt mit abweichenden Browser-Kompressor-Defaults.
- Der Worklet-Code wird offline im echten JavaScript-Modul ausgeführt und gegen die entsprechenden Python-Stufen verglichen. Es wird nicht nur auf Funktionsnamen oder dekorative Anzeigen geprüft.
- EQ übernimmt die tatsächlichen Mitten-/Präsenzfrequenzen und Q-Werte. Die tatsächliche zusätzliche Air-Korrektur, Bass-Bündelung und 2×-Oversampling werden berücksichtigt. Sättigung bei null wird umgangen.
- A/B in der Live-Vorschau heißt korrekt „Ausgangswerte/Änderungen“, nicht „Server-Master“. Beide Seiten bleiben lokale Vorschauen.
- Die Vorschau bleibt eine Näherung: native EQ-/Sättigungsimplementierung, Browser-Sample-Rate, Gesamtlautheit und Vorschau-Limiter sind nicht bitidentisch zum vollständigen Serverexport. Keine neue True-Peak-Garantie für die Live-Vorschau.
- Neuer optionaler Kontrollrender `/api/control-preview`: angemeldeter existierender Nutzer, Upload-Besitznachweis, signierte Analyse, feste Plattform-/Preset-/Override-Grenzen, 0,4–20 Sekunden, Origin-Prüfung, 16-KB-JSON-Limit, 3 Anfragen/Nutzer/Minute und globales Limit, interner Service-Token und gemeinsames DSP-Budget.
- Der Ausschnitt nutzt dieselbe `process_mastering_audio`-Funktion wie der volle Export, mit je bis zu einer Sekunde Randkontext. Die Abschnittslautheit kann von der des vollständigen Tracks abweichen. Die UI erklärt das ausdrücklich.
- Nur WAV im Arbeitsspeicher/Browser, keine neue Master-Zeile, keine dauerhafte Vorschau-Datei, kein zusätzlicher Master-Kontingentverbrauch. Abbrüche halten den DSP-Permit bis zum tatsächlichen Worker-Ende. Veraltete Antworten und Blob-URLs werden verworfen.

## E. Zurückhaltendere Bearbeitung und Hörvergleich

- Schon dichte Quellen: kleinere automatische Kompressionsverhältnisse und weniger Sättigung.
- Im Auto-Preset bei unauffälliger Balance: reduzierte Korrektur-EQ-/Sättigungs-/Kompressionsstärke. Das ist eine konservative Heuristik, keine sichere Erkennung eines „perfekten Mixes“.
- Vier-dB-Soft-Knee und materialabhängige Release-Skalierung; bestehende Reduktionsgrenzen und finale True-Peak-/Codec-Prüfung bleiben bestehen.
- Bass-Korrelation und Side/Mid-Verhältnis unter 120 Hz werden aus bis zu sechs über den Track verteilten Fenstern gemessen. Ohne gemessenes Problem bleibt Bass-Stereo erhalten. Eine negative Basskorrelation kann eine moderate, intensitätsabhängige Bündelung auslösen. Manuelle Stärke ist explizit regelbar und wird validiert. Sie repariert keine bereits ausgelöschten Inhalte.
- Optionale neue Analysefelder sind signiert und validiert; ältere signierte Analysen ohne diese Felder bleiben gültig und führen nicht zu geratenen Bass-Eingriffen.
- Manuelle Änderungen werden auch nach einem Auto-Master mit 0 % Intensität tatsächlich angewandt. Unveränderte Endwerte aktivieren die Kreativstufen dabei nicht versehentlich.

### Private Vergleiche

`python/quality_comparison.py` erstellt lokale, pegelangepasste Blindvergleiche gegen den eingefrorenen Stand `1e791f7`. Drei freigegebene reale Tracks wurden jeweils mit 20 Sekunden aus der Mitte geprüft: `25.wav`, `Again 1.wav`, `ViolinSongPsyextendedWAV.wav`.

Artefakte (nicht versioniert und nicht öffentlich):

`validation-output/mastering-quality-20261017/36314a5b/index.html`

- Beide Varianten als echte WAV24 gerendert, Länge/Sample-Rate erhalten, keine NaN/Inf, True Peak innerhalb der geprüften Toleranz.
- A/B auf gleiche integrierte Lautheit gebracht; gemessene Abweichung jeweils unter 0,02 LU (in diesem Lauf gerundet 0,0000 LU). Gemeinsame zusätzliche Peak-Absenkung würde den Pegelabgleich erhalten.
- A/B-Zuordnung zufällig je Track. Auflösung separat in `reveal.json`, technische Messungen in `measurements.json`.
- Es wurde kein menschlicher Hörtest durchgeführt. Genres und subjektive Klangqualität werden nicht aus Dateinamen abgeleitet. Der Hörvergleich ist eine notwendige Freigabe, kein bereits bestandener Qualitätsbeweis.
- Keine Originaldatei verändert, kein Track hochgeladen oder in öffentliche Assets aufgenommen.

## Prüfstand und offene Freigaben

- Vollständiger lokaler Audit-Testlauf einschließlich isolierter SQLite-Prüfungen und DSP-/Codec-Selbsttest bestanden.
- Neue gezielte DSP-Tests: Frequenzgänge, Pegelinvarianz, Soft Knee, Bass-Erhalt, 0-%-Manuell, Python/Worklet-Parität und Kontrollrender. Zusätzlich Cancellation-/Permit-Tests für den neuen Endpunkt.
- Echte lokale HTTP-Prüfung: Anmeldung/Schutz, signierte Analyse mit Bass-Messwerten, Auto-Master, manuelles Re-Mastering, authentifizierte WAV-Downloads und Kontrollrender ohne neue Master-Zeile bestanden.
- Produktionsbuild und TypeScript geprüft. Dynamische Upload-Pfade sind bewusst vom Build-Tracing ausgenommen; private QA-Dateien bleiben ausgeschlossen.
- Die Browser-Automation ließ sich auch nach einem Reset nicht initialisieren (`failed to write kernel assets`, Pfad nicht gefunden). Deshalb keine visuelle/echte Browser-Bedienprüfung als bestanden ausgeben. Offline-Worklet-Parität und Loop-Tests ersetzen diesen Schritt nicht.
- Vor Deployment: menschlicher pegelangepasster Hörvergleich und visuelle Prüfung von Reglern, A/B, Bass-Kontrolle, Loop und Kontrollrender in DE/EN. Danach isolierte Server-/Containerprüfung wie bei vorherigen DSP-Releases und erst anschließend ein autorisierter Deploy. Live-Version bleibt bis dahin unverändert.
