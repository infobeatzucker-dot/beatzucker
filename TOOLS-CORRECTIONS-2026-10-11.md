# Tools-Korrekturen – vorbereitet für 0.11.0

Stand: 11.10.2026. Lokale Umsetzung, **nicht deployed**. Grundlage ist `TOOLS-AUDIT-2026-10-11.md`. Bestehende englische Tool-Seiten wurden beibehalten und mit denselben Korrekturen versehen.

## Umgesetzte Auditpunkte

| Punkt | Umsetzung |
| --- | --- |
| T01 Vocal-Übersteuerung | Integer-WAV verweigert Übersteuerung statt Samples still abzuschneiden. Vocal-Export bietet eine transparente Gesamtpegelabsenkung auf −1 dBFS Sample-Peak. |
| T02 Vocal-Dynamik | Gemeinsame AudioWorklet-Kette für Live/Offline. Komplementäre Aufteilung ohne unterschiedlich verzögerte Zweige; 0 % echter Bypass. Dynamik stereogekoppelt. |
| T03 Kanal-Clipping | Spitzen-/Übersteuerungsprüfung berücksichtigt alle Kanäle statt nur die Monosumme. Hinweise beschreiben Fullscale/Overloads, nicht vermeintlich nachgewiesenes früheres Clipping. |
| T04 Gegenphase | Spektralenergie bleibt auch bei Auslöschung der Monosumme erhalten. API-Breite auf ihren zulässigen Bereich begrenzt; Stereo-Labor kennzeichnet undefinierte Breite. |
| T05 Stille-Konflikt | Stille oder fehlende Tieftonenergie liefert keinen erfundenen Kick-/Bass-Score. |
| T06 Album-Zustand | Stabile Track-IDs, Änderungssperre während Analyse, Mindestzahl zwei, explizite Vollständigkeit, erneute Analyse fehlender Tracks ohne Verlust erfolgreicher Messungen. |
| T07 Tieftonauflösung | Überlappende FFT-Fenster über die gesamte Datei statt weniger Stichproben. Zeitaktivität auf derselben absoluten Zeitachse; Hinweise zur Auflösung und zum gemeinsamen Vergleichszeitraum. |
| T08 Key/BPM | Stille und unbrauchbare Chroma-Profile erhalten Unknown, keinen erfundenen Camelot-Code. Tap-Tempo filtert doppelte/ungeeignete Intervalle. |
| T09 Referenz | Standardmäßig relative Bandenergie statt Lautheitsunterschied als Klangunterschied; absolute Ansicht wählbar. Echter lokaler A/B-Player mit gemeinsamer Pegelreserve. |
| T10 Streaming | Tatsächlich gemessene Codec-Werte von Prognosen getrennt. Codec-Pegelabgleich nutzt codierte LUFS und Peak-Reserve. Positionsübernahme beim Umschalten. |
| T11 Konverter | Speicherprüfung vor Zielallokation, tatsächliche Dekodierrate auswählbar, Integer-Overloads blockiert. Pegeländerung nur nach ausdrücklicher Wahl; Float bleibt verfügbar. |
| T12 Stereo/Canvas | Stille nicht als gültiges Phasenergebnis; Filterbereiche korrekt und als näherungsweise beschrieben. Größenänderungen aktualisieren statische Canvas-Grafiken. |
| T13 Median | Bei gerader Trackzahl Mittelwert der beiden mittleren Werte. |
| T14 Bedienung/Fehler | Gemeinsame Datei-/Fehlerbehandlung DE/EN, direkter Sprachwechsel, Abbruch/Stale-Result-Schutz, Ressourcenbereinigung. Trimmer mit direktem Ziehen der nächsten Grenze und Ausschnitt-Vorschau. |

Zusätzlich beim realen HTTP-Test gefunden: Spektral-Flatness von Stille lag durch Rundung geringfügig über 1 und wurde von der API zurückgewiesen. Stille erhält dafür 0; gültige Messungen werden auf den mathematischen Bereich 0–1 begrenzt. Regressionstest ergänzt.

## Überprüfung

- Produktions-Build einschließlich deutscher und englischer Tool-Routen erfolgreich.
- Gesamte Audit-Regressionssuite erfolgreich, einschließlich 13 neuer Tool-Qualitätsprüfungen, 56 Python-Tests und DSP-Selbsttest (Analyse, Mastering, WAV24, True Peak, MP3, AAC).
- Reale HTTP-Endprüfung des finalen lokalen Builds: 22 deutsche/englische Seiten erfolgreich, Stille-Key-Analyse liefert Unknown, echte AAC-Datei mit gemessener LUFS-/True-Peak-Antwort, ungültige Audiodatei liefert lokalisierten deutschen Fehler. `BEATZUCKER_ISOLATED_QA=1 node scripts/tools-http-tests.cjs` benötigt den separaten lokalen QA-Server auf Port 3013.
- Neue Tests reproduzierten vor der Korrektur unter anderem Stille-Scheinkonflikt, Gegenphasenverlust, fehlende Ziel-Speicherprüfung, stilles PCM-Clipping und fehlenden Vocal-Bypass.
- Browser, isolierte lokale Produktionsinstanz, eigene SQLite-DB und synthetisches Audio, ohne E-Mailversand: Kick/Bass mit Stille zeigt korrekten Hinweis; Album mit zwei Testtönen misst beide Tracks und zeigt −5,5 LUFS Median bei −10,5/−0,5 LUFS.
- Vocal-Browserprüfung: Live-Wiedergabe und Offline-Render funktionieren; +4-dB-Test mit deaktivierter Dynamik zeigt −5,44 dB Exportkorrektur. Ohne Schutz kommt eine Overload-Warnung statt eines Downloads.
- Trimmer-Browserprüfung: 0,40–1,50 s vorhörbar; fertige WAV mit gemessenen −14,0 LUFS, −13,94 dBTP und 1,10 s. Direktes Ziehen der Wellenformgrenze verändert den Ausschnitt und verwirft veraltete Exportwerte.
- Screenshots: `validation-output/tools-audit-20261011/` (ignorierte lokale Testartefakte).

## Bewusste Grenzen / Prüfung nach Deployment

- Vocal-Schutz ist **keine True-Peak-Limitierung**: die ganze Datei wird im Pegel abgesenkt, nicht dynamisch limitiert. UI und FAQ weisen darauf hin.
- Codec-A/B hält die Abspielposition, garantiert aber keinen samplegenauen Nullvergleich unterschiedlicher Encoderlaufzeiten.
- FFT-Konflikthilfe ist kein Beweis eines schlechten Mixes. Unterschiedliche Stem-Längen und Startpositionen müssen musikalisch beurteilt werden.
- OfflineAudioContext lässt sich nicht zuverlässig abbrechen. Bei Vocal/Konverter heißt die Aktion deshalb „Ergebnis verwerfen“; neue Verarbeitung bleibt bis zum Ende der laufenden nativen Berechnung gesperrt. Laufende Server-DSP-Arbeit kann nach Client-Abbruch noch enden.
- Die In-App-Browser-Schnittstelle meldete bei Blob-Downloads keinen Downloadabschluss. Deshalb ist der neue Vocal-Download **nicht als numerisch nachgemessene heruntergeladene Datei verifiziert**. Der ältere Download aus dem Originalaudit darf nicht als neue Datei herangezogen werden. Exportberechnung, Encoder und Überlastschutz wurden separat automatisiert geprüft. Vor Freigabe tatsächlichen Download im normalen Browser prüfen.
- Kein vollständiger End-to-End-Test aller Regler in allen Browsern, keine mobile Geräte-/Hörqualitätsfreigabe. Nach Deployment öffentliche Tools DE/EN, tatsächliche Downloads und Codec-Umschaltung mit echten Tracks prüfen.
- Kein automatisches Deployment und keine Änderung an Produktionsdaten, Serverkonfiguration oder der getrennten Upmado-Seite.
