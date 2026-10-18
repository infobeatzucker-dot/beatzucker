# 1.0.0 – Vollversion und verständlichere Audio-Hilfen

Vorbereitet am 18. Oktober 2026 auf ausdrücklichen Wunsch des Betreibers. Noch nicht deployed. Die Versionsnummer ist eine Produktentscheidung, keine Garantie für Fehlerfreiheit.

## Umgesetzt

- Sichtbare Beta-Zusätze aus Header und Versionshistorie entfernt. Zentrale Release-Version und beide Paketversionsfelder auf 1.0.0; vollständiger öffentlicher DE-/EN-Eintrag nur mit Nutzerverbesserungen.
- Bestehende LUFS- und Sample-Rate-/Bittiefe-Ratgeber auf denselben Adressen in beiden Sprachen überarbeitet: direkte Kurzantworten, praktische Tabellen, Gain-/Headroom-Beispiel, Export- und Dither-Workflow, Grenzen von Formatumwandlungen.
- Falsche Pauschalaussagen entfernt: Streaming hebt nie an, ein verpflichtender LUFS-Wert für alles, beliebig hoher Float-Dynamikumfang und gleichzeitige Ausgabe aller Mastering-Bittiefen.
- Verknüpfungen zu vorhandenen Tools bleiben erhalten, nachvollziehbare Fachquellen ergänzt. Nur tatsächlich geänderte Artikel und Stereo-Tool bekommen aktualisierte Inhaltsdaten; kein pauschales Sitemap-Datumsupdate.
- Stereo-Ergebnis erhält messwertabhängige Hörhinweise: Gegenphase, Bassband, größere Mono-Pegeländerung, Kanalbalance oder kontextuelles Gegenhören. Keine automatische Klangnote und keine pauschale Bestätigung eines fehlerfreien Stereobildes.
- Allgemeine Erläuterungen vor und nach der Analyse: tatsächliche RMS-Monosummenformel, Side/Mid-Verhältnis statt Prozent, Stille/fehlende Bandenergie, Ganzdatei-Mittelwerte und Mono-Abhören in der DAW. Keine vorgetäuschte Mono-Wiedergabefunktion.
- Keine Änderung der Analyseformeln, Mastering-DSP, Exportkette, Datenbank oder Zugriffsrechte.
- Hörbeispiele als Cover-Galerie mit aktiver zentraler Karte, Nachbarkarten, Navigation, direkter A/B-Umschaltung und ruhigen Konturen bei Wiedergabe. Reduzierte Bewegung berücksichtigt. Vorhandene Player-Engine, echte Wellenformen, Audio-Analyzer und Originalpegel-Standard bleiben unverändert.
- Die Hintergrundkonturen reagieren nun über acht grobe visuelle Frequenzbänder auf den bereits vorhandenen Analyzer am hörbaren Ausgang. Schneller Anstieg und sanftes Abklingen statt zeitgesteuerter Rotation. Kein neuer Audioknoten, keine FFT-/DSP-Änderung, kein zusätzlicher Animationsloop oder React-Render pro Frame. Pause, Trackwechsel, Unmount und reduzierte Bewegung setzen die Bewegung zurück. Sichtbarkeit wird über das gesamte Deck geprüft, damit die Ringe auch bei unterhalb des sichtbaren Bereichs liegendem Frequenzbild reagieren. Dies ist eine Audio-Visualisierung, keine BPM-/Beat-Erkennung und kein kalibriertes Frequenzmessgerät.
- Vier eigene KI-generierte Illustrationen in optimierten WebP-Dateien. Keine Künstlerfotos oder Behauptung offizieller Songcover. Neue/umbenannte Admin-Einträge verwenden automatisch generische Gestaltung; Audio-Publikation und Maximalzahl 5 bleiben unverändert.
- Startseiten auf die tatsächliche Suchabsicht ausgerichtet: DE-Titel „Online Mastering kostenlos“, EN-Titel „Free Online Mastering“, passende sichtbare Hauptüberschriften und Beschreibung. Anmeldung und Tageskontingent stehen sichtbar beim Einstieg. Keine neuen dünnen Keyword-Seiten, Rankingversprechen oder künstlichen Bewertungen. Bestehende kostenlose WebApplication-Auszeichnung bleibt unverändert.

## Quellen

- Spotify-Normalisierung: https://support.spotify.com/nl-en/artists/article/loudness-normalization/
- Audio-Grundlagen: https://www.izotope.com/community/blog/digital-audio-basics-sample-rate-and-bit-depth
- Dither: https://downloads.izotope.com/docs/rx6/39-dither/index.html
- Stereo-Hinweise mit den tatsächlichen Formeln in `lib/workerAnalysis.ts` abgeglichen; 3-/6-dB-Hinweisschwellen sind Höranlässe, keine allgemein gültigen Fehlergrenzen.

## Prüfungen

Bestanden: neue isolierte Tests für beide Sprachen, Vollversionsfelder, unveränderte Artikeladressen, Inhaltsdaten, Stille, gegenphasige Signale, negative Basskorrelation, Kanalbalance und gerenderte nächste Schritte. Cover-Galerie für 1–5 Einträge mit zyklischer Navigation, Callback-Anbindung und generischem Ersatz bei umbenannten Songs getestet. Bestehende SEO-, Versionshistorien-, Guidance-, Audit- und Player-/Tool-Qualitätsregressionen bestanden; kein neuer vollständiger Python-Audit behauptet.

Finaler Produktionsbuild einschließlich TypeScript erfolgreich. Der erste Versuch scheiterte ausschließlich am gesperrten Google-Fonts-Netzwerkabruf; der autorisierte Wiederholungsbuild bestand. Isolierte lokale HTTP-Prüfung: alle 74 Sitemap-Seiten, Canonicals, Sprachverweise und strukturierte Daten, 18 Tool-Überschriften, echte 404-Antworten, aktuelle DE-/EN-Publikationen mit fünftem Testeintrag und Rücksetzung, Keyword-Titel und sichtbare Kontingentangaben, neue Versionsnummer, vier echte WebP-Antworten und serverseitig sichtbare Stereo-Hilfen bestanden. Keine Produktionsdaten verändert oder E-Mails versendet.

Browser-Automation zur visuellen QA scheiterte bei der Initialisierung mit „failed to write kernel assets“. Keine abgeschlossene visuelle Responsive- oder manuelle Hörprüfung behauptet. Lokale Vorschau unter `http://127.0.0.1:3013/hoervergleich#before-after` für den Betreiber geöffnet. Noch nicht committed, gepusht oder deployed.

## SEO-Primärquellen

- https://developers.google.com/search/docs/appearance/title-link
- https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content

Vocal-/Stem-Tools einschließlich Freischaltung und beschränkter Vorschau sind separat in `STEM-TOOLS-PROPOSAL-2026-10-18.md` geplant, nicht Teil der implementierten 1.0-Funktionen.

Nachtrag Audio-Konturen: Neuer Band-/Envelope-Test (Stille, getrennte Bass-/Höhenimpulse, sanfter Release, Pause, reduzierte Bewegung, begrenzte Werte und Sichtbarkeits-Anbindung) bestanden. Bestehende Galerie- und Player-Tests sowie TypeScript und erneuter finaler Produktionsbuild bestanden. Aktualisierte lokale DE-/EN-Hörvergleichsseiten und isolierter Systemstatus jeweils HTTP 200. Vorschau neu gestartet; keine manuelle visuelle oder auditive Browserprüfung behauptet.
