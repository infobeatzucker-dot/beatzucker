# Mastering-Report: 414-Korrektur (vorbereitet, noch nicht deployed)

Die Korrektur wird zusammen mit den erweiterten Farbwelten in Version 1.8.0 veröffentlicht; 1.7.1 ist kein separat veröffentlichtes Release.

## Ursache

DownloadPanel übertrug Analyse, Ergebnis und Einstellungen als Base64-JSON in der GET-Adresse. Umfangreiche Resultate überschritten die Nginx-Grenze für Request-URIs, bevor die Anwendung den Bericht erzeugen konnte.

## Korrektur

- Native POST-Navigation nach `/api/report` im neuen Tab; JSON liegt im Formularinhalt statt in URL/Verlauf/üblichen URL-Zugriffslogs.
- Gleiches druckbares Layout, PDF-Speichern, Deutsch/Englisch und manuelle Einstellungen bleiben erhalten.
- `noopener` trennt den neuen Tab vom Ausgangsfenster. Bewusst kein `noreferrer`, da Chrome sonst bei Formular-POST `Origin: null` senden kann; die vorhandene Same-Origin-Kennung bleibt erhalten.
- Verzögertes Entfernen des dynamischen Formulars lässt Chrome die Navigation beginnen.
- POST prüft Herkunft und Inhaltstyp; tatsächlicher Inhalt auf 512 KiB begrenzt, auch ohne Content-Length, mit Lesefrist.
- Bisheriger GET-Handler bleibt für bereits geöffnete kleine Altberichte erhalten; neue Aufrufe verwenden ausschließlich POST.
- Keine Änderungen an DSP, Audio-Engine, Datenbank oder Nginx-Grenzwerten.

## Geprüft

- Regression für große DE/EN-Berichte, Umlaute, HTML-Escaping, manuelle Werte, ungültige Daten, fremde Herkunft und Übergröße mit/ohne Content-Length.
- Tatsächlicher Chrome-Test: native POST-Navigation, kurze URL, neuer Tab ohne opener, deutsche/englische Berichte sowie echte PDF-Ausgabe erfolgreich.
- Design-Tests, Versions-/Sprachabgleich und öffentliche Historie erfolgreich.
- Abschließender Produktionsbuild inklusive TypeScript und 131 Seiten erfolgreich.
- Browserergebnisse unter `validation-output/report-1.7.1/`.

Nach autorisiertem Deploy den PDF-Button an einem echten abgeschlossenen Master online erneut prüfen. Lokal getestet, noch nicht veröffentlicht.
