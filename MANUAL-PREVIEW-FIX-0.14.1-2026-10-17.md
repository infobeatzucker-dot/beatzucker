# Manuelle Live-Vorschau – Korrektur 0.14.1

## Ausgangspunkt

Gemeldet: Chrome, WAV 16 Bit; nur die manuelle Feinabstimmung startet spät oder hat Aussetzer. Der Haupt-A/B-Vergleich funktioniert.

Im Code gefundene Risiken: wiederholte Netzdatei-Sprünge durch ein HTML-Audioelement, AudioContext-Freigabe erst nach asynchronem Laden und unnötige Parameterarbeit für jedes einzelne Audiosample.

## Umsetzung

- Nur der gewählte Ausschnitt (maximal 20 Sekunden) wird als unbearbeitetes WAV geladen und im Browser dekodiert. Zwei Ausschnitte bleiben im Speicher. Native AudioBuffer-Loops benötigen beim Wiederholen weder Netzwerk noch Animationsframes.
- Vorladen beim Öffnen, sichtbarer Ladezustand, Bereichswechsel erst beim Loslassen. Abbruch-/Generationsprüfungen verhindern verspätete Wiedergabe einer alten Auswahl.
- Chrome-Audiofreigabe unmittelbar beim Klick, bevor auf das Effektmodul gewartet wird. Bei Pause wird der AudioContext angehalten.
- Vorschau arbeitet mit 48 kHz. Höhere Quelldatenraten werden ausschließlich für diese Vorschau heruntergerechnet. Eine 3-ms-Randblende reduziert Loop-Klicks; sie gehört nicht zum Export.
- Effektparameter werden je Audioblock geglättet und vorberechnet statt für jedes Sample erneut aus allen Metadaten gelesen. Statische DSP-Ergebnisse werden weiterhin mit Python verglichen.
- Neuer Ausschnitt-Endpunkt: Anmeldung, Upload-Eigentumsnachweis, Originprüfung, begrenzter JSON-Body, Zeitgrenzen, Ratenlimit, Realpath-Prüfung, interner Dienstschlüssel und bestehendes DSP-Speicherbudget. Keine Master-Einträge, E-Mails oder zusätzlichen gespeicherten Audiodateien.
- Haupt-A/B-Spieler, vollständige Python-Masteringkette und finale Exporte unverändert.

## Prüfungen und Grenzen

- Transport-Regressionen: native Wiederholung, Cache, Pause während Laden, konkurrierende Auswahl, Aufräumen und Vorladen.
- Python: PCM16-Ausschnitt, unveränderte Quelldatei, 96→48-kHz-Vorschau und ungültige Zeitbereiche.
- Produktionsbuild, vollständiger Audit-Testlauf (73 Python-Tests vor dem ergänzten Abbruchtest) und DSP-Selbsttest erfolgreich. Der zusätzliche Abbruchtest wurde separat erfolgreich ausgeführt. Keine Tests auf Produktionsdaten.
- Sechs echte isolierte HTTP-Prüfungen erfolgreich: Anmeldung, signierte Analyse, Auto-Master/Download, manueller Master/Download, PCM16-Quellausschnitt und Server-Kontrollrender ohne zusätzlichen Master-Eintrag.
- Ein lokaler Node-Mikrobenchmark mit zwei Effektstufen benötigte für acht Sekunden Audio 14.47 s vor und 1.49 s nach der Änderung. Dieser Lauf fand gleichzeitig mit Build/Tests statt und ist kein belastbarer Browser-Latenzvergleich oder Echtzeitversprechen.
- Hörtest mit dem betroffenen Track in Chrome nach Deployment noch erforderlich. Netzgeschwindigkeit beeinflusst das erstmalige Laden eines neuen Ausschnitts. Live-Vorschau bleibt eine Näherung; der Server-Kontrollrender ist weiterhin separat verfügbar.

Nicht deployed.
