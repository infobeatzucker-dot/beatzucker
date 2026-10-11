# Versionsnummer und öffentliche Historie

- Zentrale Quelle: `lib/releases.ts`. Der erste Eintrag liefert die im Logo angezeigte Version.
- Bei größeren Verbesserungen vor dem zugehörigen Deployment einen neuen Eintrag ergänzen. Nicht für jede kleine Korrektur hochzählen.
- Kleine Fehlerkorrektur-Releases: Patch erhöhen (z. B. 0.9.1). Größere Funktionen/Verbesserungen: Minor erhöhen (z. B. 0.10.0). 1.0.0 nicht automatisch ohne Entscheidung als stabil markieren.
- `package.json` und die zwei Projektversionsfelder im Lockfile synchron halten. Den Projektnamen nicht ändern.
- Datum und Texte vor dem tatsächlichen Deployment prüfen. Die neue Nummer wird erst mit dem neuen Build öffentlich; bei einem fehlgeschlagenen Deploy bleibt die bisherige Live-Version gültig.
- Nur umgesetzte Verbesserungen aufnehmen. Kurze, verständliche deutsche und englische Texte schreiben: Was kann der Nutzer nun besser machen, was funktioniert zuverlässiger?
- Keine internen Infrastrukturdetails, unbelegten Qualitätsversprechen oder erfundenen Veröffentlichungstermine.
- Alte Einträge 0.3.0 bis 0.8.0 sind rückwirkend nummerierte Entwicklungsmeilensteine aus dem Git-Verlauf, keine damaligen offiziellen Versionsnummern. Dies wird auf der öffentlichen Seite erklärt.
- Nach Änderungen Tests und Build prüfen. Nach autorisiertem Deployment Logo, `/versionen`, `/en/updates` und Kernfunktionen live prüfen. Keine automatische Deployment-Autorisierung aus dieser Datei ableiten.
