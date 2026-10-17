# 0.20.0 – interne Release-Notizen

Vorbereitet, noch nicht deployed. Öffentlich werden nur umgesetzte Vorteile für Endnutzer beschrieben. Adminfunktionen, technische Prüfungen und Betriebsdetails gehören ausschließlich in interne Dokumente wie dieses. Die bestehende DE/EN-Historie wurde entsprechend gekürzt; der reine Admin-Meilenstein 0.13.0 erscheint dort nicht mehr.

## Individuelle Tageslimits

- Admin → Nutzer: ganzzahliges Tageslimit 0–1000, leer/Standard = bisheriger Standard 10. Dauerhafte Einstellung, kein einmaliges Guthaben, kein Übertrag in den nächsten Tag. 0 blockiert neue Aufträge, bricht laufende nicht ab.
- Serverseitige Prüfung und Reservierung erfolgen zusammen in einer SQLite-Transaktion. Automatische und manuelle Neumaster verwenden dieselbe Begrenzung. Fehlgeschlagene Aufträge zählen nicht; Kontrollvorschauen erzeugen weiterhin keinen zusätzlichen Master.
- Anzeige im Account und Workspace verwendet das wirksame Limit, auch 0. Beim Fokuswechsel und nach Abschluss/Fehler wird aktualisiert. Eine bereits geöffnete Seite erfährt Änderungen spätestens beim Fokuswechsel bzw. bei der nächsten Serverantwort, nicht über einen Push-Kanal.
- Minimale `DailyMasterCharge`-Belege verhindern, dass das Löschen fertiger Verlaufseinträge Tageskontingente zurückgibt. Bestehende Einträge ohne Beleg werden weiterhin mitgezählt, ohne Doppelzählung. Vorherige Tage werden beim nächsten Mastering-Start bereinigt, Kontolöschung entfernt die Belege. Kontoexport und Datenschutzhinweise sind ergänzt.
- Tagesgrenze bleibt die bisherige Server-Zeitzone; diese Änderung stellt die Tagesgrenze nicht auf eine andere Zeitzone um.

## Hörbeispiele

- Admin kann Titel, Genre und Reihenfolge bearbeiten, beide Audiodateien ersetzen, Beispiele hinzufügen und entfernen. Mindestens ein und höchstens fünf Beispiele; die bisherigen vier bleiben zunächst erhalten.
- WAV/FLAC/MP3/AIFF/OGG/M4A über vorhandenen geschützten Upload. Startpunkt 0–600 Sekunden, feste 24-Sekunden-Hörprobe. Veröffentlichungsberechtigung wird vor dem Veröffentlichen ausdrücklich bestätigt.
- Original und Master werden ausgerichtet, identisch mit kurzen Randblenden als MP3 320 aufbereitet und tatsächlich nachgemessen. Kein zusätzliches Mastering und keine Normalisierung der gespeicherten Hörproben. Lautheitsabgleich bleibt im Player optional, Originalpegel bleibt Standard.
- Unsichere Ausrichtung, Stille, zu kurze Ausschnitte oder Aufbereitungsfehler verhindern die Veröffentlichung. Bisherige Beispiele bleiben dabei unverändert. Beide neuen Seiten werden erst zusammen nach erfolgreicher Prüfung veröffentlicht.
- Revisionen verhindern das Überschreiben zwischenzeitlicher Änderungen. Erneut laden bei Konflikt. Audioverarbeitung benutzt dieselbe interne Authentifizierung und begrenzte DSP-Kapazität wie andere Audioaufträge. Ein abgebrochener Request gibt Rechenkapazität nicht vorzeitig frei.
- Neue Hörproben liegen unter `/app/data/showcase`; die Sammlung liegt in `ShowcasePublication`. Bestehendes Daten-Volume erhält beides beim Deploy. Vollständige Uploads bleiben privat und unterliegen der bisherigen Upload-Frist. Gespeicherte Ausschnitte bleiben bis Austausch/Entfernung.
- Alte generierte Ausschnitte werden nach erfolgreichem Austausch entfernt; gebündelte ursprüngliche Beispieldateien werden nicht aus dem Image gelöscht. Audio-API liefert nur aktuell veröffentlichte UUID-Dateien und unterstützt Byte-Ranges. Bereits gespeicherte Browserkopien können weiter existieren.
- Öffentlicher Player lädt die Sammlung beim Seitenaufruf; eine bereits begonnene Hörsitzung wird nicht durch einen später eintreffenden Listenabruf umgeschaltet. Für neue Beispiele ggf. Seite neu laden. Keine Änderung an der A/B-Uhr oder dem Audio-Mastering.

## Master-Übersicht und Final EQ

Die offene Klangskulptur ohne inneren Scrollbereich aus dem vorbereiteten Entwurf 0.19.1 ist Teil dieses gemeinsamen Releases. Bewegungsreduktion und Pause bei Unsichtbarkeit bleiben erhalten; Messwerte stammen aus dem Ergebnis, die Skulptur ist ausdrücklich dekorativ. Siehe `MASTER-SIGNATURE-0.19.1-2026-10-17.md` für die Erklärung des optionalen Final EQ. Keine DSP-Parameter wurden verändert.

## Prüfung und Deployment

- Vollständiger lokaler Audit: alle Node-Gruppen, 93 Python-Tests und DSP-Selbsttest für Analyse, Mastering, WAV24, True Peak, MP3 und AAC bestanden.
- Echte isolierte SQLite-Tests: additive Migration einschließlich bestehendem Konto, alte INSERT-Felder weiterhin schreibbar, Admin-/Origin-Schutz, strikte Grenzen, echte Reservierungen, Verlaufslöschung und Kontolöschung.
- Hörbeispiel-Tests: echte Route-Handler mit isolierter Datenbank, Veröffentlichungsrevisionen, Dateipaarfehler, Besitzprüfung, Maximalzahl und Byte-Ranges; Python erzeugt echte synthetische MP3-Paare und prüft Pegelerhalt sowie DSP-Abbruchsicherheit.
- Öffentliche Historie auf vollständiges DE/EN, Endnutzerfokus und Versionsgleichheit geprüft.
- Produktionsbuild und TypeScript bestanden; der abschließende Build ist ohne die zuvor gefundenen Dateitracing-Warnungen durchgelaufen. Kein Produktionszugriff oder Mailversand in diesen Tests. Browser-Sichtprüfung der neuen Adminformulare ist noch separat erforderlich.
- Schemaänderungen sind additiv: nullable `User.dailyMasterLimit` sowie neue Tabellen/Relationen. Niemals `--accept-data-loss` einsetzen. Bestehender Deploy sichert die Datenbank vor dem Schemaabgleich.
- Nach autorisiertem Deploy: als Admin bei einem Testnutzer 25/Standard einstellen, Anzeige und Grenze prüfen; Hörbeispiel-Angaben ändern und in DE/EN neu laden; optional ein berechtigtes Paar veröffentlichen, beide Seiten anhören. Zum Testen keine echten Nutzer ohne Absprache verändern. Daten-Volume und aktuelle Sicherung müssen erhalten bleiben.
- Ein Rollback auf alte Anwendungsversion ignoriert die neuen Adminfunktionen und das individuelle Limit; erst die neue Version setzt es durch. Kein Schema-Downgrade und keine Rücksicherung über inzwischen neu angelegte Nutzerdaten.
