# Beatzucker: Audit der öffentlichen Audio-Tools

Stand: 11.10.2026, Version 0.10.0, lokaler Git-Stand `d0dafd5`.

## Ergebnis

Die Tools sind keine Attrappen: Spektren, Stereo-Messungen, Audio-Konvertierung,
Codec-Vorschau, Normalisierung und Vocal-Effekte werden tatsächlich berechnet.
Es gibt aber mehrere reproduzierbare Fehler und einige Qualitäts-/Bedienungsrisiken.
Vor zusätzlichen Tools sollten diese behoben werden. Kein Anwendungscode wurde
für diesen Audit geändert; kein Deployment, Commit oder Push wurde ausgeführt.

P1 = zuerst beheben, weil Audio beschädigt werden kann oder die Diagnose falsch ist.
P2 = anschließend bearbeiten, weil Zuverlässigkeit, Genauigkeit oder Bedienung leiden.
Ein nachgewiesener Codepfad ist nicht automatisch ein gehörmäßig quantifizierter Fehler:
Die Belegart steht deshalb bei jedem Punkt.

## Umfang und Grenzen

Geprüft wurden alle zehn Einträge im Tools-Hub: Mix-Check, Streaming-Vorschau,
Kick/Bass-Konflikt, Key/BPM, Konverter, Album-Konsistenz, Referenzvergleich,
Stereo/Phase, Silence/Loudness-Normalizer und Vocal-Chain. Zusätzlich ihre
gemeinsamen Browser-Audio-, Worker-, Analyse- und API-Bausteine.

- Quellcodeprüfung aller zehn Tools und der gemeinsam verwendeten Routinen.
- 20 HTTP-Prüfungen: Tools-Hub und neun `/tools/...`-Unterseiten jeweils auf
  Deutsch und Englisch erreichbar, HTTP 200. Diese Zählung enthält nicht die
  außerhalb dieses Verzeichnisses liegenden Mix-Check-Seiten.
- Live-Browsertests: stille Kick/Bass-Dateien, Album-Erweiterung nach einer
  erfolgreichen Analyse sowie Vocal-Export mit hohem Ausgangspegel.
- Lokale Zahlenproben mit dem tatsächlichen Python-Analyzer sowie den
  TypeScript-Berechnungen; künstliche, selbst erzeugte Signale statt Nutzermusik.
- 36 bestehende Tests bestanden: Codec-Vorschau 12, Silence-Normalizer 10,
  Browser-Audio 8, Upload-Budget 6. API-Regressionstests verwenden Test-Harnesses;
  sie ersetzen keine vollständigen Live-Integrationstests.

Nicht durchgeführt: subjektiver Hörvergleich, vollständige Safari-/Mobilgeräte-
Matrix, Lasttest, Missbrauchstest oder kompletter Live-Exportdurchlauf jedes Tools.
Die frühere erfolgreiche Prüfung von Auto-/manuellem Mastering ist kein Ersatz
für diese toolbezogenen Grenzfalltests.

## Priorisierte Befunde

### T01 · P1 · Vocal-Chain exportiert Übersteuerung ohne Warnung

**Beleg: live reproduziert und die heruntergeladene WAV numerisch geprüft.**

Ein zweisekündiger 1-kHz-Testton, 48 kHz Stereo, Eingangsamplitude 0,95,
De-Esser 0 %, Kompression 0 %, Output +4 dB, übrige Regler auf Standard:
Der 24-Bit-Export enthielt 94.986 von 192.000 Kanal-Samples an den
positiven/negativen Integer-Grenzen, rund **49,47 %**. Die Oberfläche meldete
keinen Übersteuerungsfehler. Das ist tatsächliches Hard-Clipping im Export,
nicht bloß ein zu hoch dargestelltes Meter. Der Zahlenbefund belegt die
Signalbeschädigung; es wurde kein subjektiver Hörtest durchgeführt.

Ursache: Die Vocal-Chain hat keinen Export-Peakschutz; der Integer-WAV-Encoder
begrenzt Werte auf den darstellbaren Bereich. Nicht jeder Standard-Preset ist
dadurch zwangsläufig betroffen, aber eine erlaubte Reglerstellung reicht aus.

**Empfehlung:** Ausgangs-Peak/True-Peak messen, Übersteuerung deutlich anzeigen,
und vor Integer-Export explizit zwischen Pegelkorrektur und geeigneter Begrenzung
wählen lassen. Nicht stillschweigend nachträglich abschneiden.

Orte: `components/VocalChainTool.tsx:6–7`, `lib/clientAudio.ts` (`encodeWav`),
Worker-WAV-Export. Belegbild: `validation-output/tools-audit-20261011/vocal-hot-export-live.png`.

### T02 · P1 · Vocal-De-Esser mischt zeitlich unterschiedliche Signalzweige

**Beleg: Quellcode und Web-Audio-Spezifikation; Ausmaß der Klangverfärbung noch messen.**

Die Kette summiert einen Tiefpasszweig unmittelbar mit einem Hochpasszweig,
der zusätzlich durch einen `DynamicsCompressorNode` läuft. Für den Tiefpass
existiert kein Latenzausgleich. Der Kompressor hat laut Spezifikation einen
festen Look-ahead. Die beiden Signale kommen somit nicht zeitgleich zusammen.
Außerdem ist die Komplementarität der verwendeten Tief-/Hochpasskombination
nicht sichergestellt. Phasenbedingte Verfärbungen sind ein ernstes Qualitätsrisiko.

0 % De-Esser ist kein echter Bypass: Ratio 6 und ein Threshold von −12 dB
bleiben aktiv. Auch die Filteraufteilung bleibt bestehen.

**Empfehlung:** Zuerst Sweep-/Impuls-/Nulltests mit 0/50/100 % durchführen.
Anschließend phasenverträgliche Bandaufteilung samt Latenzausgleich oder einen
passenden anderen De-Esser-Aufbau verwenden; 0 % eindeutig definieren.

Ort: `components/VocalChainTool.tsx:5–6`.
Quelle: [W3C Web Audio – DynamicsCompressorNode](https://www.w3.org/TR/webaudio-1.1/#DynamicsCompressorNode).

### T03 · P1 · Analyzer übersieht kanalweise Übersteuerung

**Beleg: reproduziert mit dem tatsächlichen Python-Analyzer.**

Die Clipping-Prüfung untersucht den gemittelten Mono-Mix statt alle Kanäle.
Bei einem Stereo-Testsignal mit L = 1,05 × Sinus und R = −0,95 × Sinus
ergab sich `clipping_detected: false`, obwohl der linke Kanal über Vollaussteuerung
liegt und True Peak etwa **+0,43 dBTP** beträgt. Der öffentliche Mix-Check kann
daraufhin „Keine Clipping-Spitzen“ ausgeben. Eine separate True-Peak-Warnung
macht diese widersprüchliche Aussage nicht richtig.

**Empfehlung:** kanalweise Sample-Peaks, Übersteuerung und True-Peak getrennt
prüfen. Aus einem einzelnen Peak oberhalb 0,99 lässt sich außerdem noch keine
zuverlässige Aussage über vorheriges Hard-Clipping ableiten; Texte entsprechend präzisieren.

Orte: `python/analyzer.py:360`, `components/PublicMixCheck.tsx:14–16`.
Betroffen sind Tools mit dieser gemeinsamen Analyse; Änderungen brauchen
auch Regressionstests für die übrigen Verbraucher des Analyzers.

### T04 · P1 · Gegenphasiges Stereo kann den gesamten Analysebericht verhindern

**Beleg: tatsächlicher Analyzer plus Prüfung des API-Validierungscodes.**

Für L = 0,8 × Sinus und R = −0,8 × Sinus wurde eine Stereo-Breite von
**5.656.854.016** berechnet. Die API akzeptiert maximal 20 und verwirft deshalb
den gesamten Bericht. Das ist kein Live-Ausfallnachweis, aber ein reproduzierbarer
Analyzer-Wert mit eindeutigem Ablehnungspfad. Gerade ein Phasenproblem sollte
diagnostiziert werden, statt eine allgemeine Analysefehlermeldung auszulösen.

**Empfehlung:** verschwindendes Mid-Signal ausdrücklich behandeln und eine
gültige Diagnose „extrem gegenphasig / Breite nicht sinnvoll bestimmbar“ liefern.
Nicht einfach den Grenzwert entfernen oder riesige Werte als normale Messung anzeigen.

Orte: `python/analyzer.py:327`, `lib/analysisValidation.ts:11`,
`app/api/mix-check/route.ts:102`.

### T05 · P1 · Kick/Bass-Tool meldet bei Stille einen starken Konflikt

**Beleg: live und durch lokale Berechnung bestätigt.**

Zwei vollständig stille WAVs erzeugten **68/100**, „Starke Überlagerung“ und
100 % Überlagerung bei 35 Hz. Ursache ist die spektrale Normalisierung:
Ein gleichmäßig leeres Spektrum wird auf durchgehend 1 normiert.
Die niedrige zeitliche Aktivität verhindert den falschen Gesamtbefund nicht.
Auch das Mitteln gegenphasiger Stereo-Kanäle kann das Spektrum entleeren.

**Empfehlung:** absolute Mindestenergie und Signalgültigkeit vor relativer
Normalisierung prüfen. Bei Stille/fehlendem Bass keine Konfliktwertung und
keine EQ-Empfehlung ausgeben; Stereo-Energie nicht durch unkontrollierte
Mono-Auslöschung verlieren.

Orte: `lib/workerAnalysis.ts:10–23`, `components/KickBassConflictTool.tsx`.
Belegbild: `validation-output/tools-audit-20261011/silent-conflict-live.png`.

### T06 · P1 · Album-Ergebnis kann unvollständig sein und trotzdem „stimmig“ heißen

**Beleg: live sowie in einer Komponenten-Zustandsprobe bestätigt.**

Nach einer erfolgreichen Track-Analyse wurde ein weiterer Track hinzugefügt.
Die bisherige positive Zusammenfassung blieb stehen; der neue Track war nicht
analysiert und der Startknopf fehlte. Schon ein einzelner erfolgreicher Track
reicht für „Stimmiges Release“. Bei teilweisen Fehlern entsteht derselbe
irreführende Eindruck. „Neu analysieren“ verwirft auch die gültigen Ergebnisse.

Weitere Codeprobleme: Während der laufenden Analyse können neue Dateien
hinzukommen, die der anschließend zurückgeschriebene alte Snapshot wieder
aus der Auswahl verdrängt. Der Resetknopf bleibt während Teilanalysen aktiv.
Diese Rennbedingungen wurden nicht zusätzlich live provoziert.

**Empfehlung:** Ergebnis als X von Y gemessenen Tracks kennzeichnen, mindestens
zwei Tracks für einen Vergleich verlangen, neue/fehlgeschlagene Tracks separat
nachanalysieren und stabile Track-IDs sowie konsistente Busy-Regeln verwenden.

Ort: `components/AlbumConsistencyTool.tsx:4–5`.
Belegbild: `validation-output/tools-audit-20261011/album-partial-live.png`.

### T07 · P2 · Kick/Bass-Vergleich ist zeitlich und spektral zu grob

**Beleg: Quellcode.**

Maximal 56 FFT-Fenster à 4.096 Samples decken bei 48 kHz höchstens etwa
4,78 Sekunden Signal ab, verteilt über die Datei. Kurze Ereignisse zwischen
den Fenstern können fehlen. Unterschiedlich lange Dateien werden anhand ihrer
relativen Position statt identischer Zeitpunkte verglichen. Eine kurze Kick-Spur
und ein langer Bass-Stem sind daher nicht automatisch zeitlich ausgerichtet.
Bei 48 kHz beträgt die FFT-Auflösung etwa 11,72 Hz; mehrere dargestellte
Frequenzpunkte verwenden denselben FFT-Bin. Eine genaue Einzel-Hertz-Empfehlung
ist damit überpräzise.

**Empfehlung:** gemeinsamer Zeitbereich, Offset-/Längenprüfung, robusteres
Sampling und passende Frequenzbereiche statt scheinexakter Peak-Frequenzen.

Orte: `lib/workerAnalysis.ts:2–23`, `components/KickBassConflictTool.tsx`.

### T08 · P2 · Key/BPM braucht „nicht bestimmbar“ und eine Vertrauensanzeige

**Beleg: tatsächlicher Python-Aufruf von `detect_key` plus Quellcode.**

Eine Nullsignal-Probe liefert C-Dur, weil die Routine ohne aussagekräftige
Chroma-Korrelation auf ihren Ausgangswert zurückfällt. Es gibt keinen
zurückgegebenen Vertrauensgrad. Das heißt nicht, dass jede stille Datei durch
die gesamte Upload-API kommt; die Tonarterkennung selbst besitzt diesen Fehler.

**Empfehlung:** fehlende harmonische Energie erkennen, „nicht bestimmbar“
anzeigen, Konfidenz und plausible Alternativen liefern. BPM bei unsicherer
Erkennung mit Halb-/Doppeltempo-Alternativen erklären. Tap-Tempo gegen
Doppelklicks, zu kurze Intervalle und einzelne Ausreißer absichern.

Orte: `python/analyzer.py:130`, `components/KeyBpmTool.tsx`.

### T09 · P2 · Referenzvergleich vermischt Klangbalance und absoluten Pegel

**Beleg: Quellcode und unmittelbare Skalierungsbeziehung der RMS-Werte.**

Die Banddifferenzen werden ohne Lautheitsausgleich dargestellt. Derselbe Mix
mit +3 dB zeigt daher in allen Bändern +3 dB, obwohl seine Klangbalance gleich
geblieben ist. Die aktuelle Darstellung misst reale absolute Energie; sie ist
nicht erfunden, aber für einen klanglichen Vergleich leicht missverständlich.
Die empfohlene lautheitsangepasste Hörkontrolle ist im Tool selbst nicht vorhanden.

**Empfehlung:** zwischen absoluter Energie und pegelbereinigter Klangbalance
umschalten; optional synchrones, lautheitsangepasstes A/B mit den Originaldateien.
Bei einem Fehler des zweiten Tracks den ersten Messwert behalten und nur den
fehlgeschlagenen Track erneut analysieren.

Ort: `components/ReferenceComparisonTool.tsx` (`run`, `bands`, Ergebnisdarstellung).

### T10 · P2 · Streaming-Prognose und echte Codec-Messung besser verbinden

**Beleg: Quellcode.**

Die Risikokachel verwendet weiterhin den prognostizierten Peak des Originals
und pauschale Codec-Reserven, selbst nachdem eine echte codierte Datei vorliegt.
Der separat angezeigte Codec-Peak betrifft die Datei vor dem Wiedergabe-Gain;
das ist korrekt beschriftet, aber nicht der Peak der aktuellen normalisierten
C-Wiedergabe. Beim Wechsel zwischen Original und Codec wechselt zudem die
Audioquelle; ein synchroner Positions-/Encoder-Delay-Ausgleich fehlt.
Der identische Gain garantiert keine exakt identische wahrgenommene Lautheit
zwischen Original und verlustbehaftetem Codec.

**Empfehlung:** Rohdatei und normalisierte Wiedergabe getrennt messen/anzeigen,
nach dem Rendering den tatsächlichen Codec-Peak für die Bewertung verwenden,
Position und Encoder-Verzögerung im Vergleich berücksichtigen. Plattformwerte
als vereinfachte Modelle kennzeichnen; Geräte-/Normalisierungsmodi und
Albumverhalten sind nicht mit einem einzigen LUFS-Ziel vollständig abgebildet.

Ort: `components/StreamingPreviewTool.tsx` (`values`, `renderCodec`, Player).
Offizielle Hintergrundquelle für Spotify-Modi:
[Spotify – Loudness normalization](https://support.spotify.com/bh-en/artists/article/loudness-normalization/).

### T11 · P2 · Konverter prüft die Zielgröße zu spät

**Beleg: Quellcode; kein absichtlicher Speicher-/Browserabsturz ausgelöst.**

Der Decoder begrenzt die Anzahl der Eingangssamples. `resampleAudio` legt aber
den vollständigen Zielpuffer an, bevor die Exportstufe ihren eigenen Grenzwert
prüfen kann. Eine starke Erhöhung der Sample-Rate kann deshalb vorher bereits
sehr große Puffer erzeugen. Eingang, Ziel, Worker-Kopie und Download belegen
zusätzlich gleichzeitig Speicher. Ein 80-MB-Dateilimit allein ist kein RAM-Limit.

Native Metadaten werden aktuell nur für WAV/FLAC erkannt. Andere Formate
werden zunächst mit 48 kHz dekodiert; die angezeigte Rate ist dann die
Dekodierrate, nicht zwingend die Originalrate. Andere native WAV-Raten als
44,1/48/88,2/96 kHz passen außerdem nicht zur angebotenen Auswahl.

**Empfehlung:** Ziel-Samplezahl und kombinierten Speicherbedarf vor Rendering
begrenzen, native Rate/Decode-Rate klar unterscheiden und eine gültige
„Originalrate beibehalten“-Auswahl anbieten. Integer-Export bei Float-Overs
ebenfalls warnen, statt still zu clippen.

Orte: `lib/clientAudio.ts` (`decodeAudio`, `resampleAudio`, `encodeWav`),
`components/AudioConverterTool.tsx:5–6`.

### T12 · P2 · Stereo/Phase bewertet fehlendes Signal wie echte Messwerte

**Beleg: lokale Berechnung und Quellcode.**

Stilles Stereo ergibt Korrelation 0 und kann dadurch eine Phasenprüfung
auslösen; stilles Mono ergibt dagegen Korrelation 1. Ohne Signal ist beides
keine belastbare musikalische Aussage. Die benannten Frequenzbänder sind
einfache Filterbereiche: Es gibt keinen expliziten 20-Hz-Hochpass und keinen
20-kHz-Tiefpass, obwohl die Bandbeschriftung diese Grenzen suggeriert.

**Empfehlung:** Energie-/Gültigkeitsstatus, präzisere Bandbeschriftung oder
passend definierte Filter. Vektorskop und Spektrum bei Größenänderungen erneut
zeichnen; die hier verwendeten statischen Canvas-Effekte reagieren nur auf
neue Ergebnisse, nicht auf jede Änderung der Darstellung.

Orte: `lib/workerAnalysis.ts` (`inspectStereo`, `bandCorrelations`),
`components/StereoPhaseTool.tsx:11`, Spektrumdarstellung des Kick/Bass-Tools.

### T13 · P2 · Album-Median ist bei gerader Trackzahl falsch beschriftet

**Beleg: Quellcode.**

Es wird das obere der beiden mittleren Elemente gewählt, nicht deren Mittelwert.
Bei −16 und −10 LUFS erscheint daher −10 LUFS statt des üblichen Medians −13.
Das beeinflusst auch die Pegelhinweise.

**Empfehlung:** Standard-Median berechnen oder den anders gewählten
Referenzwert ausdrücklich so benennen. Die Klangfarbenbewertung nur nach
Spektralschwerpunkt ist außerdem sehr grob: als Hinweis, nicht als umfassende
Prüfung der tonal gleichen Album-Master darstellen.

Ort: `components/AlbumConsistencyTool.tsx:4`.

### T14 · P2 · Gemeinsame Upload-/Fehlerbedienung und Barrierefreiheit vereinheitlichen

**Beleg: Quellcode und sichtbare Vocal-Bedienung.**

- Mehrere Tool-Requests besitzen keinen benutzerseitigen Abbruch und keine
  konsistente Behandlung veralteter Antworten. Serverseitige Timeouts sind
  vorhanden, ersetzen aber keinen Abbruch nach Dateiwechsel/Navigation.
- `/api/mix-check` antwortet bei jedem fehlgeschlagenen `/info`-Aufruf mit
  „nicht dekodierbar“/415, auch wenn es eigentlich ein Dienstfehler ist.
  Analyse-Fehlermeldungen sind überwiegend Englisch und erscheinen so auch
  in deutschen Tools.
- `accept="audio/*"` lässt in Upload-Dialogen mehr Formate auswählen, als
  die serverseitige Analyse unterstützt. Größen-/Längen-/Dekodierbudgets und
  Wartelimits sollten vor Start klar sein, statt erst nach dem Upload.
- Der Vocal-Playknopf hat keinen zugänglichen Namen; sein Uploadbereich ist
  per Tab erreichbar, aber ohne Tastaturaktivierung. Nach Laden einer Datei
  fehlt eine direkte Möglichkeit, eine andere Datei zu wählen.
- Bei Auswahländerungen und langen Vorgängen klare Busy-/Fortschrittsanzeigen,
  angekündigte Statusmeldungen sowie einheitliche Wiederholen-/Abbrechen-Knöpfe.

**Empfehlung:** gemeinsamer Tool-Upload/Request-Baustein mit lokaler
Vorvalidierung, Fehlercodes/DE-EN-Texten, Request-ID, AbortController,
verständlicher Wartemeldung und barrierefreien Bedienelementen. Bestehenden
Origin-, Upload-Budget- und DSP-Schutz dabei erhalten.

Orte: `app/api/mix-check/route.ts:87–114`, Tool-Komponenten.

## Weitere sinnvolle Qualitätsverbesserungen

Diese Punkte sind weniger dringend bzw. müssen vor einer Fehlerbehauptung
noch gezielt geprüft werden:

- Vocal-Parameter weich überblenden statt direkt auf `.value` setzen; mögliche
  Klicks mit schnellen Reglerbewegungen testen. Bei wiederholtem Play/Stop
  ganze Graphen aufräumen und schnelle Mehrfachklicks absichern. Der Offline-
  Export hat exakt Eingangslänge; Kompressor-Latenz und Signalende mit einem
  Impuls am Dateiende prüfen, bevor eine abgeschnittene Ausklingphase behauptet wird.
- Silence-Normalizer: echte Vorhörfunktion für den behaltenen Abschnitt,
  Anfang/Ende direkt an der Wellenform verschieben, Stille explizit melden.
  Die vorhandene serverseitige Nachmessung und Peak-Korrektur sind positiv;
  in den geprüften Regressionstests trat kein neuer Renderfehler auf.
- Wiederholte Analysen derselben unveränderten Datei innerhalb der aktuellen
  Tool-Sitzung wiederverwenden, statt unnötig vollständige DSP-Läufe auszulösen.
  Keine globale, dauerhafte Audioablage allein für diese Optimierung einführen.
- Canvas-Größenanpassung, Tastaturbedienung und Browser-Ressourcenfreigabe
  vereinheitlichen. Mehr Animation ist nicht automatisch besser: Messwerte
  und echte Rückmeldung sollten Vorrang vor dekorativer Bewegung haben.
- Für öffentliche Ratenlimits serverseitig prüfen, welche Proxy-IP-Header
  tatsächlich vertrauenswürdig sind. Die produktive Nginx-Konfiguration wurde
  in diesem Audit nicht vollständig geprüft; keine bestätigte Umgehung behauptet.

## Empfohlene Umsetzungsreihenfolge

1. T01/T02: Vocal-Exportschutz und verlässliche De-Esser-Kette.
2. T03/T04/T08: gemeinsame Analyse für Kanal-Overs, Gegenphase und unsichere
   Tonart robust machen. Danach alle Analyzer-Verbraucher regressionsprüfen.
3. T05/T07/T12: ehrliche Signal-/Konflikt-/Stereo-Diagnosen und Zeitbezug.
4. T06/T13: Albumzustand, Teilfehler, Nachanalyse und Median korrigieren.
5. T09/T10: musikalisch aussagekräftiger Referenz-/Codec-Vergleich.
6. T11/T14: Speicher-Vorprüfung, konsistente Fehler-/Abbruchbedienung,
   Zugänglichkeit; danach Normalizer-Vorhören und zusätzliche Feinarbeit.

## Abnahmetests für die Überarbeitung

Für jeden bestätigten Fehler zuerst einen fehlschlagenden Regressionstest
ergänzen und erst danach korrigieren:

- Stille, sehr leise Signale, reines Mono, Gegenphase, einseitige Float-Overs.
- Kick/Bass mit gleichen und unterschiedlichen Längen, Anfangsversatz und
  isolierten Transienten zwischen den bisherigen FFT-Fenstern.
- Album: 1/2/8 Tracks, gerader Median, nachträgliches Hinzufügen, Teilfehler,
  Retry nur fehlender Tracks und Dateiänderungen während einer Analyse.
- Vocal: 0-%-Bypass, Sweep, Impuls am Dateiende, alle Presets, extreme erlaubte
  Reglerstellungen, Peakschutz sowie Vergleich Preview/Export.
- Konverter: 44,1/48/96/192 kHz Eingang, verschiedene Bittiefen, native/Decode-
  Rate, Float-Overs und Zielpuffer oberhalb des Budgets ohne tatsächliche OOM-Allokation.
- Streaming/Reference: gleicher Track mit unterschiedlichem Gain,
  Positions-/Delay-Ausgleich und gemessener Peak nach angewandtem Gain.
- Lange Requests abbrechen, Netzwerk-/Dienstfehler, Rate-Limit, DE/EN,
  Tastatur, kleine Bildschirmgrößen sowie Chrome/Firefox/Safari prüfen.

## Prüfbelege

Künstliche Dateien und Bilder liegen unter
`validation-output/tools-audit-20261011/` (vom Git-Tracking ausgeschlossen).
Der tatsächlich heruntergeladene und geprüfte Vocal-Export lag bei der Prüfung
unter `C:/Users/USER/Downloads/hot-tone-vocal-chain.wav`.

![Live: Stille ergibt fälschlich starken Konflikt](validation-output/tools-audit-20261011/silent-conflict-live.png)

![Live: Zusätzlicher Albumtrack ohne aktualisiertes Ergebnis](validation-output/tools-audit-20261011/album-partial-live.png)

![Live: Vocal-Export ohne Übersteuerungswarnung](validation-output/tools-audit-20261011/vocal-hot-export-live.png)
