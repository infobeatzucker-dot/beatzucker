# Songabschnitte, Character und aktuelle Hilfe — vorbereitet, nicht deployed

Ergänzt die Referenz- und Dynamikarbeiten im noch unveröffentlichten Release 1.5.0. Kein Commit, Push oder Deployment in diesem Arbeitsschritt.

## Signalbasierte Songabschnitte

- Tatsächliche Energie-/Crest-Messungen in Ein-Sekunden-Fenstern über den Track, ohne phasenauslöschende Monosumme. Relative Bewertung innerhalb des Songs statt Abhängigkeit vom Dateipegel.
- Zustände ruhig, ausgeglichen und dicht; zwei bestätigende Fenster und Mindestlängen schützen vor Abschnittswechseln durch einzelne Hits. Maximal 64 Metadatensegmente, vollständige Abdeckung der Dauer. Stille/zu kurze Signale liefern keine Karte.
- Keine semantische Strophe-/Refrain-, Text- oder Genre-Strukturerkennung behauptet.
- Tatsächlicher DSP-Einfluss: Bus-Kompression wird in ruhigeren Regionen auf 55 %, in dichten auf 80 % ihres berechneten Eingriffs zurückgenommen; ausgeglichen bleibt unverändert. 750 ms Übergangsbereich auf jeder Seite einer Grenze. Keine abschnittsweise Pegelnormalisierung und keine zusätzliche Anhebung.
- Plan wird in der Analyse validiert, an die Quelldauer gebunden und mitsigniert. Alte Analysen ohne Karte bleiben gültig. Ungültige Lücken, nicht-endliche Werte, erfundene Labels und übergroße Pläne werden abgewiesen.
- Native Vorschau nutzt dieselben Stärken und Quellzeiten; der Loop-Player meldet tatsächlichen Wiedergabestart und -bereich. Wiederholungen verwenden Songposition statt fortlaufender Abspieldauer. Server-Kontrollrender berücksichtigt den realen Anfang seines Kontextfensters.
- Keine Speichergrenzen angehoben; die Stärke-Hüllkurve entsteht in begrenzten Blöcken, und der Bus-Mix arbeitet ohne zusätzliche vollständige Stereo-Zwischenkopien.

## 3D-Character-Regler

- Native CSS-/SVG-Oberfläche statt Bitmap-Scheinregler: heller Cyan-/Violett-Metallkörper, geriffelter Rand, Schatten, Reflexion, Zeiger und Fortschrittsbogen. Desktop und Mobilbreite visuell geprüft.
- Echte Pointer-Bedienung mit Capture/Cancel, vertikalem und horizontalem Ziehen; Pfeiltasten, Umschalt, Home/End, Page Up/Down, Doppelklick und Reset. ARIA-Slider mit lokalisiertem Werttext und Fokusmarkierung.
- 0 = transparent, 0.5 = ausgewogen, 1 = druckvoll. Neutral verändert die bisherigen Parameter nicht. Charakter skaliert die Kompressionsverhältnisse und Sättigung innerhalb fester Grenzen; Ziel-LUFS, Peak-Grenze und Stereobreite werden nicht dadurch verändert.
- Intensität wird anschließend angewendet. Bei Intensität 0 bleibt die automatische Klangbearbeitung aus. Manuelle Overrides kommen zuletzt und haben Vorrang.
- Der letzte abgeschlossene Master liefert den Character-Kontext für manuelle Neuerstellung und Kontrollrender. Ein nachträglich im Dashboard bewegter Regler verändert nicht stillschweigend den manuellen Ausgangspunkt.
- Node-Endpunkte prüfen endliche Zahlen zwischen 0 und 1; Python prüft ebenfalls. Default für ältere Aufrufe ist 0.5. Keine Datenbankmigration nötig; der reale Parametersatz enthält den Wert.

## Wissen, FAQ und Ablauf

- Gemeinsame aktuelle DE-/EN-Workflowkarten auf Homepage, Features und Hilfe; acht zusätzliche zweisprachige FAQ-Einträge zu Character, Abschnitten, Referenzen, dynamischem EQ/Limiter, manueller Vorschau, A/B, Audio-Tools und Stem-Zugang.
- Neuer Leitfaden unter `/ressourcen/referenz-mastering-character` und `/en/knowledge/referenz-mastering-character`; bestehende Adressen für Automatik-, manuelle und Streaming-Ratgeber erhalten.
- Aktualisiert: Automatik-Kette mit den tatsächlichen zwölf angezeigten Schritten und bewussten Bypässen; Vorschau-/Kontrollrender-/Export-Unterschiede; Referenzgewichte statt Lautheitskopie; kein obligatorisches Mono-Bass-Filtering; keine garantierten Bearbeitungszeiten oder pauschal alle Exportformate pro Lauf.
- Tools einschließlich WAV zu MP3, Audio-Cutter, Sprachbereiniger, Analysewerkzeuge und getrennt freigeschalteter Stem-Funktionen verständlich eingeordnet. Keine automatische Spenden-Freischaltung oder technische Kopierschutzgarantie behauptet.
- Veraltete Basics-Aussage, Software höre über kalibrierte Monitore, entfernt. Einzelreferenz-Aussage im Homerecording-Ratgeber an das Mehrreferenzsystem angepasst. Vergleichsartikel enthält die aktuellen eigenen Funktionen ohne neuen Klang-Siegeranspruch.
- Spotify-Normalisierung sachlich korrigiert anhand [Spotify for Artists](https://support.spotify.com/artists/article/loudness-normalization/). Die Quelle wird im Artikel verlinkt; nicht mehr behauptet, leisere Tracks würden grundsätzlich nie angehoben.
- Lange FAQ-Antworten nicht mehr bei 400 px abgeschnitten: semantisches Auf-/Zuklappen mit ARIA und vollständigem Text auch auf Mobilgeräten.
- Tatsächlich geänderte Inhaltsdaten und Sitemap angepasst, alte Erstveröffentlichungen beibehalten. 16 Artikel, 86 zweisprachige Sitemap-Einträge. Keine geänderten Rechtsbedingungen in diesem Schritt.

## Verifiziert

- Finaler Produktionsbuild erfolgreich mit Next.js 16.4.3, TypeScript und 130 erzeugten statischen Seiten.
- Gesamter Node-Audit erfolgreich; nach letzter Erweiterung zusätzlich komplette Python-Tests erneut ausgeführt: 131 bestanden. Bestehender DSP-Selbsttest (WAV24, True Peak, MP3, AAC, Sprachbereinigung) ebenfalls erfolgreich.
- Sechs neue Abschnitt-/Character-Audiotests inklusive Gain-/Polaritätsinvarianz, Schutz gegen ungültige Metadaten, realer Bus-Wirkung, weicher Grenzen, Quelloffset und Loop-Wrap-Parität mit dem tatsächlich ausgelieferten Worklet.
- Neue Node-Tests für signierte Abschnitte, echte Drehregler-Handler, manuelle Character-Snapshots und aktuelle DE-/EN-Inhalte; bestehende Inhaltszählungen und Datumsprüfungen gezielt an den ergänzten Artikel angepasst.
- Echte isolierte HTTP-Aufrufe: Upload/Analyse mit signierter Karte, Referenzen, Auto-Master, manueller Master, private WAVs, Kontroll-WAV, Character 0/1 mit unterschiedlichen DSP-Parametern und sicheren Ausgaben, ungültige Character-Werte abgewiesen.
- Echtes Chrome-Profil: Tastatur, Pointer-Drag, Reset, DE/EN, 390-px-Layout, tatsächliche Energiekarte, Originalpegel-A/B-Standard. Screenshots im ignorierten `validation-output/sections-character-1.5/` visuell geprüft. Die vollständige mobile Kartenaufnahme nutzt eine höhere Aufnahmefläche; Überlauf wurde separat bei 390×844 geprüft.
- Öffentliche DE-/EN-Artikelrouten, ein H1, Canonicals, Workflow-Verlinkung, FAQ-Suche, ARIA-Zustände und vollständige Antworten im mobilen Chrome geprüft.
- Nutzerdateien unverändert lokal gelesen: „On Tour“ ergab 7, „Back to My Acid“ 12 gemessene Regionen. Jeweils neue 24-Sekunden-Kopien als Pop/Club, Intensität 65 und Character 0/0.5/1 nach MP3 320 exportiert. Alle sechs Ausgaben bestanden die Peak-Prüfung. Die Endstellungen verändern tatsächliche Audiosamples, nicht nur angezeigte Parameter. Ergebnisse liegen in `validation-output/sections-character-1.5/quality-report.json`.
- Kein subjektiver Blind-Hörtest oder allgemeiner Qualitätsvorsprung behauptet. Keine Produktionsdateien, reale Konten oder Mailzustellungen für die HTTP-Tests verwendet.

## Wiederholen

Mit vorhandenem FFmpeg über `FFMPEG_BINARY`: `node scripts/run-audit-tests.cjs`.

Lokale isolierte Vorschau: `node scripts/run-tools-qa.cjs`, anschließend Bereitschaft von `/api/health` abwarten. Mit `BEATZUCKER_ISOLATED_QA=1` und vorhandenem Playwright:

- `node scripts/reference-mastering-http-qa.cjs`
- `node scripts/current-learning-browser-qa.cjs`
- `python/venv/Scripts/python.exe python/sections_character_quality_probe.py --source <lokale-WAV>`

Vor späterem Deployment Datum/Version prüfen und persönlichen Hörvergleich durchführen. Die öffentlichen Änderungen sind derzeit ausschließlich lokal vorbereitet.
