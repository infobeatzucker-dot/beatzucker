# Vorschlag: freischaltbare Vocal- und Stem-Tools

Idee des Betreibers, noch nicht implementiert oder öffentlich beworben. Keine zusätzlichen Dienste gebucht und keine Modelle installiert.

## Gemeinsamer Kern, zwei Ansichten

- Vocal Remover: Gesang und Instrumental.
- Stem Separation: zunächst Vocals, Drums, Bass und übrige Instrumente. Zusätzliche Instrumente erst nach belegter Qualität, keine pauschale Zusage für Piano/Gitarre.
- Synchroner gemeinsamer Transport, Solo/Mute, Einzel-WAV und ZIP. Kein unabhängiges Abspielen mehrerer Audioelemente mit schleichendem Versatz. Originalvergleich bei konsistentem Pegel.
- Eigenständiges Beatzucker-Design und eigene Texte, kein Kopieren von Marken, Grafiken oder Qualitätsversprechen der Beispiele.

## Zugriff und Ressourcen

- Ergänzter Betreiberwunsch: Ohne Freischaltung eine kurze Stem-Vorschau ermöglichen, jedoch keine vollständigen Stems oder Exporte ausliefern. Vorschlag: 20 Sekunden, Anmeldung und eigenes begrenztes Testbudget. Länge/Budget sind noch keine implementierten Produktbedingungen.
- Preview-Worker verarbeitet nur den berechtigten Ausschnitt bzw. gibt ausschließlich kurzlebige Vorschau-Assets aus; Vollresultate bleiben außerhalb öffentlicher Verzeichnisse. Direkte Voll-Download-APIs ohne Berechtigung ablehnen, nicht nur Buttons verstecken. Abhörbares Audio kann technisch aufgezeichnet werden; keine absolute Kopierschutzgarantie.

- Zwei explizite Berechtigungen pro Nutzer im Adminbereich, standardmäßig aus. Optional Ablaufdatum und getrenntes Tages-/Minutenbudget, unabhängig vom Masteringlimit.
- Manuelle Freischaltung nach Prüfung einer Unterstützung; keine automatische Zahlungserkennung behaupten. Bei verpflichtender Gegenleistung steuerliche/rechtliche Einordnung vor Bewerbung separat klären.
- Serverseitige Prüfung bei Start, Status, Vorschau und Download; Jobbesitz immer verifizieren. Widerrufene Freischaltung darf keine weiteren Jobs ermöglichen. Bestehende Jobs/Downloads und Ablaufregeln vorher festlegen.
- Separater Worker/Queue, begrenzte Parallelität, Upload-/Dauerlimits, Timeout, Abbruch, Fehlerzustände und automatische Bereinigung. Mastering bleibt unabhängig.
- Letzter bekannter Serverstand rund 4 GB RAM, zusätzlich zwei Webanwendungen. Kein Produktionsversuch ohne lokalen Benchmark und festgelegtes Ressourcenbudget. Eigenen Worker oder GPU-Dienst nur nach Betreiberentscheidung samt Kosten/Datenschutz prüfen.

## Qualitätsprüfung vor Integration

1. Lokal auf eigenen Pop-/Club-/Vocal-Tracks Modelle vergleichen: hörbare Gesangsreste, Transienten, Hall, Bass, Phasenstabilität und Rückmischung.
2. CPU-/RAM-/Laufzeit über ganze Songs messen, nicht nur kurze Testsignale. Zwei-Ausgaben-Modus kann intern eine vollständige Separation benötigen.
3. Modell-/Gewichtslizenzen, Wartungszustand, sichere Modellbeschaffung und reproduzierbare Versionen prüfen. Demucs ist eine mögliche Vergleichsbasis, kein bereits ausgewählter Produktionsstandard.
4. Nur nach Infrastrukturentscheidung Rechte-/Job-Backend, Player und Adminoberfläche umsetzen; echte Ergebnisse vor Freigabe testen.

## Referenzen

- https://emastered.com/vocalremover
- https://emastered.com/stemify
- https://github.com/facebookresearch/demucs (ursprüngliches Repository archiviert; Wartungshinweise beachten)

Keine Garantie für artefaktfreie Isolation oder die Qualität eines anderen Anbieters. Kein Deployment Teil dieses Vorschlags.
