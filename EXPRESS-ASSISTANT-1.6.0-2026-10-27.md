# Express-Assistent 1.6.0 — vorbereitet, nicht deployed

## Funktionsumfang

- Zusätzliches, freiwillig geöffnetes Popup im Dashboard; ursprüngliche Konsole vollständig verfügbar. Kein automatisch aufgezwungenes Onboarding.
- Sechs DE/EN-Schritte: Song/Analyse, Ziel, Klang, freiwillige Referenzen, Zusammenfassung/Exportformat und Ergebnisübergabe.
- Ein bestehender UploadZone-Besitzer mit zusätzlichem Imperative-Handle: Datei-Picker und Drop aus dem Assistenten delegieren an denselben Upload-/Analyse-Job. Schließen entfernt den Uploader nicht. Keine zusätzliche Upload-API oder eigene DSP-Routine.
- Plattform, Genre, Character, Intensität, Referenzen und Format verwenden direkt den Zustand der Konsole. Öffnen setzt keine Einstellungen zurück. Haupt- und Referenzanalyse sind vor dem Fortfahren abgesichert; Referenzen bleiben freiwillig.
- Erst expliziter Start im Zusammenfassungsschritt ruft das bestehende handleRun auf. MasteringRun schützt weiterhin synchron vor Doppelstarts. Konto, Tageskontingent, signierte Analyse, Besitzprüfung und Export bleiben bestehende Serververantwortung.
- Originales 12-Stufen-Fortschrittsfenster während des Jobs. Erfolg öffnet Ergebnis-Schritt; Anhören/Download führt zum ursprünglichen Ergebnisbereich, alternativ öffnet sich die bestehende manuelle Feinabstimmung. Bestehender Master-Autostart unverändert.
- Fehler führt mit erhaltener Auswahl zur Zusammenfassung zurück; keine automatische Render-Wiederholung. Reset/andere Datei invalidiert wie bisher alte Jobs und setzt den Assistentenschritt zurück.
- Native dialog-Top-Layer mit beschriftetem Titel/Beschreibung, expliziter Tab-/Shift-Tab-Führung, Escape/Schließen und Fokus-Rückgabe. Kein Durchreichen von M/A/B/Space an die darunterliegende Konsole. Body-Scroll wird wiederhergestellt; Downloadübergabe fokussiert die vorhandene Downloadüberschrift.
- Responsive 320/390-Pixel-Ansicht, sichtbarer Footer, Reduced Motion. FAQ und Ablaufhinweis DE/EN ergänzt; Sitemap-Daten nur für tatsächlich geänderte öffentliche Inhalte aktualisiert.

## Prüfung

- Produktionsbuild Next 16.4.3/TypeScript erfolgreich; keine neue Dependency, Datenbankmigration oder DSP-Änderung.
- Vollständige bestehende lokale Regressionssuite bestanden, darunter 131 Python-Tests und self_test mit Analyse/Mastering/WAV24/True-Peak/MP3/AAC/Speech-Cleanup.
- Neue Unit-/Renderprüfungen für sechs bilinguale Schritte, Auth/Datei/Analyse/Kontingent-Gates, einen gemeinsamen Upload-/Renderbesitzer und vorhandenen Autostart.
- UploadZone-Harness erweitert: Assistent nutzt denselben Picker/Upload, nicht angemeldete Imperativaufrufe öffnen nur Anmeldung.
- Isolierter Chrome-End-to-End-Test mit generiertem 6-Sekunden-Stereo-WAV: Anmeldeübergang, ungültige Datei ohne Netzwerkjob, genau ein Upload und eine Analyse trotz Schließen, übernommene Einstellungen, Shortcut-Abschirmung, Fokus/Escape, 320/390 px ohne horizontalen Überlauf, absichtlich simulierter HTTP-400-Fehler mit Auswahl-Erhalt, genau ein echter Job bei Doppelklick, tatsächlich gespeicherte Club/Pop/Character-Parameter, Peak-Grenze, echter WAV-Download über den sichtbaren Button und manuelle Feinabstimmung.
- Keine Produktionsdaten, Produktionsmails oder Serveränderungen. Screenshots und generierte Audios liegen ausschließlich ignoriert unter validation-output/express-assistant-1.6/.

## Lokale Wiederholung

1. `node scripts/express-assistant-tests.cjs`
2. `node scripts/upload-motion-tests.cjs`
3. `node scripts/run-audit-tests.cjs` mit gültigem FFMPEG_BINARY.
4. Produktionsbuild, danach `node scripts/run-tools-qa.cjs` (isolierte QA-Datenbank, localhost:3013/8013, kein Mailversand).
5. BEATZUCKER_ISOLATED_QA=1 und PLAYWRIGHT_MODULE auf vorhandene Playwright-Installation setzen, dann `node scripts/express-assistant-browser-qa.cjs`.

Die separate Google-Suchanfragenprüfung ist in SEO-QUERY-INVESTIGATION-2026-10-27.md dokumentiert und führte zu keiner SEO-/Sicherheitsmutation.
