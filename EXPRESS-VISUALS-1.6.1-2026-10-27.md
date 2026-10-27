# Express 1.6.1 — vorbereitet, nicht deployed

- Grafischer, vollständig anklickbarer DE/EN-Express-Einstieg: Startseite in der linken Hero-Spalte, Dashboard in der vorhandenen Seitenleiste. Ein React-Portal erhält denselben Workspace-Zustand; es gibt keinen zweiten Mastering-Controller. Mobil kompakter Einstieg anstelle der ausgeblendeten Seitenleiste.
- Während Upload/Analyse zeigt der Assistent eine CSS-Animation und den aktuellen Zustand anhand der vorhandenen Upload-Rückmeldung. Keine erfundenen Prozentwerte und kein vorgetäuschter Audio-Analyzer während der Analyse.
- Ergebnis-Popup: Original/Master-Schalter, Play/Pause, Hörposition und optionaler Lautheitsabgleich. Alle Aktionen gehen an den bestehenden AudioEngineContext; kein zusätzlicher Player, Audiokontext oder Download-Endpunkt. Bestehender Autostart bleibt erhalten.
- Canvas-Ringe lesen Spektrum und Zeitdaten des bestehenden echten Analyzers. Keine zeitgesteuerte Fake-Beat-Reaktion. Maximal 30 Bilder/s, feste Zeichenfläche, keine React-State-Updates pro Animationsbild. Pause, ausgeblendeter Tab, geschlossenes Popup und Reduced Motion stoppen die kontinuierliche Animation. Beim Unmount werden Listener und RAF entfernt.
- Keine Änderung an DSP, Mastering-Parametern, Datenbank oder Serverkonfiguration. Version und öffentliche DE/EN-Historie auf 1.6.1 vorbereitet.

## Prüfungen

- Produktionsbuild Next.js 16.4.3 einschließlich TypeScript bestanden.
- Express-Render-/Gate-Tests, Upload-Tests, Wissens-/FAQ- und Release-Tests bestanden.
- Isolierter Chrome-Test bestanden: linke Dashboard- und Startseiten-Platzierung, kompakter Einstieg bei 320/390 px, sichtbare Analyseaktivität, Original/Master-Umschaltung mit bestehendem weichem Übergang, echte Analyzer-Lesezugriffe, unterschiedliche Canvas-Bilder bei tatsächlicher Wiedergabe und identische Bilder bei Pause. Auch Fehler-Wiederholung, ein Job bei Doppelklick, Download, manuelle Übergabe und Tageslimit bestanden. Der Download-Übergang liegt im festen Popup-Footer und bleibt sichtbar.
- Ausschließlich lokale QA-Datenbank, synthetisches Stereo-Audio, kein Mailversand und keine Produktionsänderung.
- Abschließender Layout-Test nach der Positionierung oberhalb der Vorteile: Desktop-Einstieg links neben der Konsole im ersten Viewport, Startseite bei 390/320 px ohne Überlauf und Popup-Bedienung bestanden (`scripts/express-entry-layout-qa.cjs`).
