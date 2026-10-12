# Beatzucker 0.12.0 – SEO, Orientierung und Bibliothek

Stand 12.10.2026: lokal umgesetzt und geprüft; ein Server-Deployment ist separat zu bestätigen.

## Umgesetzt (Deutsch und Englisch)

- Sitemap mit 72 eindeutigen öffentlichen URLs. Änderungsdaten beziehen sich auf den jeweiligen Inhalt statt auf jeden Abruf. Unveränderte Hilfe-/Rechts-/Unterstützungsseiten altern nicht mit jeder Versionsnummer mit. Gegenseitige Sprachalternativen einschließlich deutschem Standardziel.
- Zehn ausdrücklich illustrative schriftliche Praxisbeispiele, keine erfundenen Hörtests, Bewertungen oder Messergebnisse. Beispiele erklären Ausgangslage, Vorgehen und Grenzen der Interpretation.
- Wissensartikel verlinken passende Tools, Toolseiten verlinken passende Ratgeber. Wissen und Tools enthalten zusätzlich drei Produktionsfragen als Einstieg.
- Nach tatsächlichen Ergebnissen folgen nächste Schritte unter den Messergebnissen. Clipping, schwache Mono-Kompatibilität und knappe Peak-Reserve werden vorrangig berücksichtigt, soweit diese Werte vorliegen. Keine pauschale Mastering-Empfehlung bei problematischem Mix-Check.
- Gleiche Statuskomponente für Verarbeitung, Abschluss, unvollständige Messungen und Fehler in allen zehn Tools. Keine künstlichen Prozentzahlen oder Restzeiten. Ein erfolgreicher Abschluss besagt nicht, dass das Audio fehlerfrei ist. Vorhandene Abbruch-/Wiederholungsfunktionen bleiben erhalten.
- Hinweise nach der Analyse im Mastering-Workspace; Ratgeber öffnen in einem neuen Tab, damit der geladene Track nicht verloren geht. Auto-/Manual-DSP, Exporte und Parameter bleiben unverändert.
- Bibliothek: einzelne oder alle nicht laufenden Einträge per Checkbox markieren, Zwischenzustand im Kopf, Anzahl und Auswahl aufheben. Gemeinsames Löschen nach ausdrücklicher Warnung: Master-Dateien werden mit gelöscht, nicht wiederherstellbar. Bestehende authentifizierte Einzel-Löschroute wird sequenziell genutzt; nur bestätigte Server-Erfolge verschwinden, fehlgeschlagene Einträge bleiben ausgewählt. Doppelklickschutz, verlässliche Fehleranzeige und Beenden der betroffenen Vorschau.
- Bereits vorbereitete neue Admin-Registrierungsmail wird in dieser Version mit ausgeliefert; keine separate Veröffentlichung von 0.11.1. Details in `ADMIN-REGISTRATION-MAIL-2026-10-12.md`.

## Prüfungen

- TypeScript und abschließender Produktions-Build: erfolgreich, 107 generierte Seiten.
- Audit-JavaScript-/API-/SQLite-Suites erfolgreich; danach 56 Python-Tests und DSP-Selbsttest separat mit freigegebenem lokalem Python ausgeführt: Analysis, Mastering, WAV24, True Peak, MP3, AAC erfolgreich. Der Sandbox-Versuch konnte den externen Python-Interpreter zunächst nicht starten; kein fachlicher Testfehler.
- Neun neue ausführbare Tests: Inhalte und echte Links, priorisierte Folgeempfehlungen, eindeutige Sitemap und Sprachpaare, Status-Semantik, Sprachen, Netzwerk-/Serverfehler beim Löschen, echte Bibliotheks-Handler mit Auswahl/Abbruch/Teilfehler. Für letztere werden React-Hooks und Serverantworten isoliert simuliert.
- HTTP-Prüfung des abschließenden Builds: alle 72 Sitemap-Ziele liefern 200; Praxisbeispiele und Wissen→Tool-Verbindungen sind DE/EN im HTML vorhanden.
- 22 Tool-Seiten DE/EN liefern 200, drei echte Tool-API-Prüfungen (stille Tonartanalyse, echter AAC mit Messwerten, ungültiges Audio auf Deutsch) erfolgreich.
- Echte authentifizierte lokale Lösch-API: ohne Anmeldung 401, fremder Nutzer 404, zwei eigene Testeinträge gelöscht, fremder Eintrag unverändert. Nur separate lokale SQLite-Testdaten; keine Produktionsdaten oder echten Mails.
- Browser: Fortschritt und Abschluss an echtem synthetischem Audio sichtbar; DE-/EN-Praxis-/Wissenslinks sichtbar. Mehrfachauswahl und „Alle auswählen“ mit Zwischenzustand und Ausschluss laufender Einträge geprüft. Die irreversible Bestätigung wurde nicht angenommen. Beim automatisierten Abbrechen des nativen JavaScript-Dialogs hing die Browser-Steuerung; drei Fixture-Einträge sind weiterhin vorhanden, Benutzer wurde um Abbruch des lokalen Dialogs gebeten. Das ist keine bestätigte Fehlfunktion des Lösch-Endpunkts.

## Deployment und Nachkontrolle

- Gewohnten ressourcenbegrenzten Buildx-Builder und unveränderliches, mit Git-Revision beschriftetes Image verwenden; danach `deploy/deploy.sh --prebuilt-image …`. Kein Git-Reset, keine Löschung von Laufzeitdaten, Upmado bleibt unberührt.
- `ADMIN_EMAIL` und funktionierender Resend-Zugang müssen auf dem Server gesetzt sein. Keine Schlüssel oder vollständige `.env` in Chat/Logs ausgeben.
- Nach Deployment: Logo 0.12.0, `/versionen`, `/en/updates`, Sitemap, je eine Wissen-/Toolseite, Bibliotheksauswahl und Kern-Mastering prüfen. Destruktive Tests nur an ausdrücklich entbehrlichen Einträgen. Admin-Mail anhand einer neuen Registrierung selbst empfangen lassen; normale Logins dürfen keine neue Registrierungsnachricht auslösen.
- Sitemap kann anschließend in der Search Console erneut eingereicht werden. Keine Garantie für Rankings oder Rich Results.

## Bewusst später

Neue Admin-Auswertungen, Mail-Queue-Oberfläche, Demo-Audios, weitere Tools, mobile Audio-Reglerüberarbeitung und zusätzliche SEO-Kampagnen sind nicht umgesetzt.
