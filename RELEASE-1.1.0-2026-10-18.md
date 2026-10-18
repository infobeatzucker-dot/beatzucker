# 1.1.0 – deutliche Musikimpulse, Cover-Pool und aktueller Vergleich

Vorbereitet am 18. Oktober 2026. Noch nicht deployed. Live bleibt bis zur gesonderten Veröffentlichung Version 1.0.0.

## Änderungen

- Die bisher sehr weiche Ringe-Bewegung durch impulsorientierte Darstellung ersetzt: schnellere FFT mit 2048 Samples statt 256, geringere Analyzer-Glättung, echte Zeitbereichs-RMS- und Bass-Anstiege, kurze 95-ms-Pulshüllkurve und 170-ms-Sperre gegen Doppelauslösung. Die Ringe skalieren sichtbar bis 42 % zusätzlich, statt hauptsächlich zu wabern oder zu rotieren.
- Bestehender Analyzer am hörbaren Ausgang nach der A/B-Pegelauswahl, keine zusätzlichen Audioknoten oder Gain-/DSP-Eingriffe. Die Änderungen betreffen nur Messauflösung und Visualisierung. Kein BPM-Raster, keine erfundenen Beats. Stille, Pause, Trackwechsel und reduzierte Bewegung stoppen bzw. neutralisieren die Darstellung.
- Sechs neue generierte Cover im bestehenden Stil; mit den vier vorhandenen zehn Motive. Zufällige eindeutige Zuordnung für bis zu fünf tatsächlich veröffentlichte Tracks. Kein fünfter Song erfunden. Neue/umbenannte Tracks können denselben generischen Pool nutzen.
- Zuordnung erst im Client-Effect, stabiles SSR, keine neuen Bilder bei A/B-Wechsel oder pro Frame. Eine optionale SessionStorage-Liste merkt nur die letzten Bildpfade, keine Nutzerkennung oder Höraktivität. Mit erlaubtem Speicher vermeidet jeder Track eine unmittelbare Wiederholung beim nächsten Seitenaufruf im selben Tab; bei blockiertem Speicher bleibt die Auswahl zufällig. Datenschutzhinweis in DE/EN ergänzt.
- Bestehenden Vergleichsartikel unter derselben DE-/EN-Adresse vollständig aktualisiert: automatisches und Referenz-Mastering, echte Grenzen der manuellen Live-Vorschau, erneuter Gesamttrack-Export, sieben auswählbare Formate, A/B-Abgleich, Bibliothek und zehn aktuelle Tools. Album-Konsistenz ist ausdrücklich Analyse, keine automatische Album-Masteringfunktion. Vocal Chain ist keine Source-Separation.
- Geplante Vocal-/Stem-Tools nicht als verfügbar dargestellt. Veraltete Preisrankings, unbelegte Serverstandorte und pauschale Negativhäkchen entfernt; offizielle LANDR-/eMastered-Seiten verlinkt. Selbstdarstellung und fehlender unabhängiger Klangvergleich ausdrücklich benannt.
- Sichtbare Version/Paketfelder und öffentliche DE-/EN-Historie 1.1.0. Benchmarkdetails bleiben intern und sind keine öffentliche Funktionsankündigung.

## Prüfungen

Neue Tests: zehn 120-BPM-Testimpulse erzeugen zehn diskrete Pulse, gleichmäßige Signale keinen freilaufenden Beat; Stille/Pause/reduzierte Bewegung, begrenzte Werte, Live-Ausgangsanbindung. Zehn reale Coverdateien, fünf eindeutige Karten, 200 Besuche ohne direkte Wiederholung je Track, stabile Zuordnung bei fünftem Eintrag und sichere optionale Speicherwerte. Vergleichsartikel in beiden Sprachen mit zehn realen Tools und nachvollziehbaren Grenzen geprüft. Bestehende Player-, Galerie-, Metadaten-, Guidance- und Versionshistorien-Tests ebenfalls prüfen.

Der isolierte Stem-Ressourcentest ist in `STEM-RESOURCE-TEST-2026-10-18.md` dokumentiert. Keine Stem-Abhängigkeiten, Modelle, Testaudios oder Testkonten in der Produktionsanwendung installiert oder veröffentlicht.

## Abschließende Prüfung

Produktionsbuild einschließlich TypeScript bestanden. Alle oben genannten Node-Regressionen, bisherigen Tool-Qualitätsprüfungen, SEO-/Frontend-/Versionshistorien-Tests bestanden. Kein neuer vollständiger Python-DSP-Audit behauptet; die Mastering-Routine wurde nicht verändert.

Echter isolierter Chrome-Browsertest mit tatsächlicher WebAudio-Wiedergabe: drei Beispiele zeigten Pulsmaxima 1,00 / 0,84 / 1,00 und jeweilige Signalspannen von etwa 0,99 / 0,83 / 0,99. Keine bloße Test-Sinus-Ansteuerung des UI. Zufälliger Wechsel nach Neuladen, Pause, reduzierte Bewegung und mobiles Layout ohne horizontales Überlaufen bestanden. Desktop-/Mobile-Screenshots visuell kontrolliert; keine manuelle Klangqualitätsbewertung daraus abgeleitet. Der Cookie-Hinweis wurde im frischen Testprofil normal bestätigt.

Die Screenshots und der maschinenlesbare Browserbericht liegen Git-ignoriert unter `validation-output/showcase-1.1/`. Die lokale Vorschau bleibt auf Port 3013. Noch kein Commit, Push oder Deploy autorisiert/ausgeführt.
