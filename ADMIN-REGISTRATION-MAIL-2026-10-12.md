# Admin-Mail für neue Registrierungen – enthalten in 0.12.0

Lokale Umsetzung vom 12.10.2026. Die zunächst separat vorbereitete 0.11.1 wurde nicht veröffentlicht; die Funktion wird zusammen mit den SEO-/Frontend-Änderungen in 0.12.0 ausgeliefert. Deployment und echte Admin-Mailzustellung müssen separat bestätigt werden.

## Verhalten

- Neue E-Mail-/Passwort-Konten und neue Google-Konten legen zusammen mit dem Nutzer atomar einen Benachrichtigungsauftrag an.
- Bestehende Nutzer, normale Logins und administrativ angelegte Konten werden nicht nachträglich benachrichtigt. Keine Migration mit rückwirkenden Meldungen.
- Die Warteschlange wird beim Serverstart und danach jede Minute geprüft. Bei funktionierendem Dienst erfolgt die Meldung daher normalerweise innerhalb etwa einer Minute.
- Versand an genau die konfigurierte Adresse `ADMIN_EMAIL`, von `noreplay@beatzucker.de`. Kein Rückfall auf eine andere Empfängeradresse. `RESEND_API_KEY` muss funktionieren.
- Inhalt: E-Mail-Adresse, optionaler Name, Zeitpunkt in Europe/Berlin, Google oder E-Mail/Passwort sowie Link zum Adminbereich. Keine Passwörter, OTPs, Tokens, IPs oder Audiodaten. Nutzerfelder HTML-escaped; feste Betreffzeile.
- Mailprobleme blockieren die Registrierung nicht. Fehlgeschlagene Nachrichten bleiben gespeichert und werden mit zunehmendem Abstand bis höchstens 30 Minuten zwischen Versuchen erneut versucht.
- Ein atomarer Claim schützt vor normalen parallelen Doppelversendungen; die vorhandene Resend-Idempotenz wird genutzt. Keine globale Exactly-once-Garantie für beliebig lange Ausfälle zwischen Provider-Annahme und Speicherung des Versandstatus.
- Bei Kontolöschung wird der zugehörige Auftrag per Fremdschlüssel gelöscht. Bereits erfolgreich versandte lokale Auftragsdaten werden nach 30 Tagen bereinigt. Das löscht keine Nachrichten aus dem Admin-Postfach.
- Isolierte QA und Builds starten keinen Nachrichten-Sweep. Tests versenden keine echten Mails.
- Datenschutzhinweise Deutsch/Englisch ergänzen die neue Verarbeitung sachlich; keine neue vollständige juristische Prüfung oder Rechtssicherheitszusage.

## Datenbank / Deployment

Neue Tabelle `RegistrationNotification`, 1:1-Fremdschlüssel zu `User`, ohne zusätzliche Pflichtspalten in bestehenden Nutzerdatensätzen. Die normale Start-Routine erstellt sie über Prisma. Keine manuelle Schemaänderung oder `--accept-data-loss` nötig. Die neue lokale Prisma-Client-Generierung ist erfolgreich.

Vor Deployment normalen Backup-/Rollback-Ablauf verwenden. Auf dem Server `ADMIN_EMAIL` prüfen, ohne API-Schlüssel oder `.env` hier zu veröffentlichen. Nach Freigabe je ein echtes Passwort- und Google-Testkonto registrieren und Empfang im Admin-Postfach bestätigen; normaler erneuter Login darf keine zusätzliche Registrierungsmeldung erzeugen.

## Tests

- 10 isolierte Versand-/Queue-Tests: Empfänger, Sender, HTML-Escaping, Zeitzone, keine Geheimnisse, fehlende Empfängeradresse, Providerfehler, Wiederholung, atomare Claims, Restart-/Löschfälle, Build-/QA-Sperre.
- 4 echte SQLite-Tests: additive Migration des bisherigen Schemas erhält bestehende Konten ohne rückwirkende Aufträge, atomare Konto-/Auftragserstellung, kein Teilkonto bei gescheiterter verschachtelter Anlage, Lösch-Cascade.
- Bestehende 7 Consent-Tests zusätzlich prüfen, dass beide Registrierungswege den passenden Auftrag speichern.
- TypeScript-Prüfung und Produktions-Build erfolgreich. Der erste eingeschränkte Build scheiterte am Google-Fonts-Netzwerkabruf; mit freigegebenem Abruf erfolgreich, keine Font-/Designänderung nötig.
- Vollständige Audit-Regressionssuite einschließlich 56 Python-Tests und DSP-Selbsttest erfolgreich. Zusätzlicher Migrationstest nach Ausbau des SQLite-Tests erneut erfolgreich. Kein realer Mailversand und noch keine Bestätigung einer echten Admin-Mailzustellung.

## Ideen – noch nicht umgesetzt

SEO: Search-Console-Suchanfragen auswerten, echte Audio-Praxisbeispiele und mobile Leistungswerte messen. Sitemap-Daten, schriftliche DE-/EN-Praxisbeispiele und die Verbindung Wissen/Tools sind inzwischen in 0.12.0 umgesetzt. Keine erfundenen Bewertungen oder SEO-Massenartikel.

Frontend: eigener Demo-Track ohne Upload und bessere mobile Bedienung der Audioregler bleiben spätere Ideen. Nächste Schritte nach der Analyse und einheitliche Tool-Statusanzeigen sind inzwischen in 0.12.0 umgesetzt.

Admin: Registrierungs-/Nutzungsentwicklung, aktivierte vs. ungenutzte Konten, Mail-Warteschlangenstatus, Fehler- und Laufzeitansicht je Audio-Tool, serverseitige Pagination/Filter statt Laden aller Nutzer, Auditprotokoll wichtiger Admin-Aktionen. Die Nutzersuche ist bereits vorhanden und muss nicht neu gebaut werden.
