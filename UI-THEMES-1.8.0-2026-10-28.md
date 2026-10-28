# Farbwelten 1.8.0 – noch nicht veröffentlicht

## Änderungen

- Zusätzlich zu den fünf bestehenden Designs: Obsidian Gold, Midnight Cobalt, Velvet Plum, Arctic Ice, Pistachio Studio und Rose Quartz.
- Auswahl in Navigation und Dashboard, unterteilt nach hell/dunkel. Die elf Profilkacheln bieten dieselbe Kontospeicherung wie zuvor.
- Bestehende geriffelte 3D-Regler (Charakter und Referenz-Lab) bleiben erhalten. Feinere gebürstete Metallflächen, gerichtete Reflexe, schmale Lichtkanten und abgestimmte Schatten; keine vereinfachten Regler aus der Vorschau übernommen.
- Keine neuen Audioeffekte, kein Austausch der Regler-Logik, keine Änderung an Grenzen, Tastaturbedienung oder Mastering-Parametern.
- Alle Farben einschließlich Canvas-Anzeigen und nativer heller Formulare folgen der Auswahl. Original bleibt Standard; bestehende Kontowünsche bleiben gültig.
- `scripts/generate-ui-theme-palette.cjs` generiert Farbtokens und semantische Variablen aus derselben Palette. `--check` erkennt veraltete Dateien. Die ursprünglichen 1060 RGB-Tokens bleiben erhalten.
- Korrektur des Report-Fehlers 414 enthalten, siehe `REPORT-FIX-1.7.1-2026-10-27.md`. Dieser vorbereitete Patch wird nicht separat veröffentlicht.

## Geprüft

- Alle elf Paletten: eindeutige IDs, Textkontraste, gültige Canvas-Farben, korrekter heller/dunkler Bootstrap, blockierter Speicher, vollständige Farbtokens.
- API: nur eigenes Konto, alle sechs neuen Werte erlaubt, unzulässige Werte/Zusatzfelder und veraltete Sitzungen abgelehnt.
- Chrome: elf tatsächliche Oberflächen und Metallregler, Express-Popup, alle sechs neuen Kontospeicherungen mit Neuladen, Wiederherstellung in zweitem Browser, Deutsch/Englisch, mobile Navigation und Profil bei 320/390 px.
- Referenzregler: Grenzen, Tastatur, Ziehen, Abbruch und Zurücksetzen unverändert geprüft.
- Audio-/Animationsregressionen, Express- und Abschlussübergänge, öffentliche Historie und Report-Transport erfolgreich.
- Chrome-Reportprüfung: große deutsche/englische Berichte, kurze POST-URL, separater Tab ohne opener und tatsächliche PDF-Ausgabe erfolgreich.
- Echter Express-Ablauf im Velvet-Plum-Design: Upload, Analyse, Auto-Master, A/B-Umschaltung, echte Audioanimation, WAV-Download und Übergabe zur manuellen Feinabstimmung erfolgreich.
- Abschließender Produktionsbuild: TypeScript und 131 Seiten erfolgreich. Finale Kopfleiste mit langen Designnamen bei 320/390/768/1024/1340/1440/1600 px ohne Überlauf und umbrechende Navigation geprüft.

## Abgrenzung

Keine Änderung an Python/DSP, Audio-Engine, Mastering-Aufruf, manueller Vorschau oder Datenbankschema. Lokale Tests verwenden ausschließlich isolierte synthetische Testdaten, keinen Mailversand und keine Produktionsdateien.

Noch kein Commit, Push oder Deploy dieses Releases. Nach autorisierter Veröffentlichung online Farbauswahl, gespeicherten Login-Wunsch und PDF-Button prüfen.
