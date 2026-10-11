# Audit-Korrekturen – Zwischenstand 11. Oktober 2026

## Lokal umgesetzt

- Next.js 16.4.0, React 19.3.0, NextAuth 4.24.15 und gezielte Paketupdates; Node-24-LTS-Dockerbasis. Entwicklungswerkzeug concurrently aus Produktionsabhängigkeiten entfernt.
- Passwort-Reset setzt den Sitzungswiderruf und verbraucht den Reset-Link atomar. OTP-Einmalverbrauch ebenfalls atomar. Gelöschte Nutzer verlieren die Sitzung; Prüfintervall höchstens eine Minute, noch keine sofortige Prüfung jeder sensiblen Aktion.
- Auth-JSON-Anfragen haben eine echte Byte-Grenze (auch ohne Content-Length), ein globales Limit und adressbezogene Limits. Kein Vertrauen in beliebig gesetzte IP-Header. Verteilte Limits für mehrere Instanzen sind weiterhin offen.
- Bestätigungsmails verwenden fest `noreplay@beatzucker.de`, unabhängig von alten EMAIL_FROM-Werten. Resend-Fehler und fehlende Versand-IDs werden geprüft. OTP-Versandfehler melden keinen Erfolg mehr.
- Streaming- und Vocal-Vorschau schließen ihren AudioContext nicht mehr bei Export-URL-Wechseln. Codec-Wechsel entfernt alte Ergebnisse; fehlender True-Peak-Header wird nicht als 0 dBTP interpretiert.
- Float-WAV erhält Headroom über ±1. WAV-/FLAC-Metadaten bestimmen die Browser-Dekodierrate; mehr als zwei Kanäle werden zurückgewiesen. Grenze für dekodierte Samples. Bei Formaten ohne hier ausgelesene Metadaten wird auf 48 kHz dekodiert; die Grenze greift dort erst nach dem Dekodieren.
- DSP-Slots bleiben bei Coroutine-/SSE-Abbruch bis zum tatsächlichen Ende des Executor-Workers reserviert. Worker-ID bleibt solange für Wiederherstellung und Bereinigung sichtbar.
- Master-Wiederherstellung regelmäßig statt einmalig. Aktive Python-Worker werden geschützt; bei unbekanntem Worker-Zustand kein Löschen.
- Nur noch Node-Dateibereinigung: dieselbe `completedAt + Downloadfenster`-Frist wie die Download-API, separate Behandlung verwaister Dateien und Schutz aktiver Jobs. Kein paralleler Python-/Supervisor-mtime-Cleaner mehr.
- DB-/Python-Healthroute im Docker-Healthcheck und Deploy-Smoke-Test. Fehlgeschlagenes git fetch stoppt den Deploy; Schemafehler stoppen den Containerstart nach Rücksicherung.
- Widerrufsformular setzt Busy auch nach Netzwerkfehlern zurück.
- Zusätzlich: dauerhafte Widerrufseingänge in eigener Prisma-Tabelle, idempotente Formularwiederholung, atomare Versand-Claims, empfängerbezogene Versandnachweise und automatische Wiederholungen. Die Oberfläche unterscheidet gespeicherten Eingang von zum Versand übergebener E-Mail. Reguläre Retention drei Jahre, gesperrte Nachweise geschützt; deutsche/englische Datenschutzhinweise ergänzt.
- Seite „In eigener Sache“ (`/in-eigener-sache`, `/en/support`), freiwillige Unterstützung über den vorhandenen PayPal-Link, Footer-/Panel-Verweise und Spendenhinweis in gemeinsamen Mailvorlagen. Kapazitätsausbau und höheres Master-Limit ausdrücklich als Ziel, nicht als garantierte Gegenleistung.
- Audio-Laufzeitdateien explizit aus Turbopack-Tracing genommen; lokale Datenbanken, Backups und Validierungsdateien aus dem Docker-Kontext ausgeschlossen.
- Beta-Version 0.9.0 am Logo, verständliche zweisprachige Versionshistorie unter `/versionen` und `/en/updates`, Footer-Links, Sitemap und Pflegeanleitung. Ältere Meilensteine aus Git-Verlauf rückwirkend nummeriert und auf der Seite als solche erklärt.

## Noch offen – nicht als erledigt behandeln

- Widerrufswarteschlange live unter Linux nach Deployment prüfen; tatsächliche Zustellung, Spam-Einstufung und Erreichbarkeit des Admin-Postfachs lokal nicht verifiziert. Datenschutz-/Aufbewahrungstext ersetzt keine juristische Prüfung im Einzelfall.
- Erneute Lautheitsmessung des tatsächlich gewählten/fadeten Ausschnitts beim Silence Normalizer und Anzeige der erreichten Werte.
- Gemeinsames Budget für FFmpeg-Codec-Rendering und DSP sowie schmaler Peak-/Loudness-Endpunkt.
- Kontosicherheitsaktionen: Reauthentifizierung/zweiter Faktor beim Deaktivieren von 2FA und Löschen, passende Bedienoberflächen. Englisch im AuthModal und konsistenter OAuth-AGB-Nachweis.
- Web-Worker-Export, Animationen nur sichtbar/bei Bedarf zeichnen, weitere Multipart-/RAM-Budgetierung und mobiles Profiling.
- Synthetischer DSP-Funktionstest im Deployment zusätzlich zur Erreichbarkeitsprüfung; readiness polling statt fester Wartezeit. Docker-Linux-Start/Neustart und Rollback praktisch testen.

## Prüfungen

- 17 Python-Tests bestehen, einschließlich echtem synthetischem Rendering, True-Peak-Grenzen, manuellen Overrides, Lease-Abbruch und tatsächlichem SSE-Routenabbruch.
- TypeScript besteht. Separater Node-Regressionstest prüft Audio-Export/Metadaten, Auth-Byte-Grenzen/Origin, Versandfehler, Dateiaufbewahrung und Wiederherstellung mit gemockten Abhängigkeiten.
- npm nach gezielten Updates: 0 bekannte Schwachstellen zum Prüfzeitpunkt. Das garantiert nicht die Abwesenheit aller Sicherheitsfehler.
- Abschließender Produktionsbuild erfolgreich: 102 Seiten, darunter beide Versionshistorien. Keine Broad-Pattern-/Whole-Project-Tracing-Warnungen mehr; bestehende Edge-Runtime-Deprecation bleibt als separater Modernisierungspunkt. 12 Node-Regressionstests und 17 Python-Tests bestehen (29 insgesamt). Kein angemeldeter Browser-/Mobile-End-to-End-Test dieses Standes.
- Keine echten E-Mails versendet, keine Nutzerdaten für Tests gelöscht und kein Deployment dieser Änderungen durchgeführt.
- Erweiterter Stand abschließend geprüft: 17 Python-Tests, 14 Node-Regressionstests und vier echte SQLite-Integrationsprüfungen bestehen (35 insgesamt). SQLite-Prüfungen umfassen Eindeutigkeit, konkurrierende Versand-Claims, Bestand nach Client-Neustart und Schutz gesperrter Nachweise. Die SQLite-Prüfung erzeugt ausschließlich eine temporäre Datenbank und entfernt sie danach. Prisma-Schema validiert; bestehende Nutzerdatenbank nicht verändert. Produktionsbuild mit 104 Seiten auch nach den letzten Panel-/Formularänderungen erfolgreich.

## Vor Live-Deployment

- Absenderdomain beatzucker.de bei Resend muss für den Versand freigeschaltet sein. Falls nur upmado.com verifiziert ist, schlägt der Versand mit dem neuen Absender korrekt fehl.
- Node und Python müssen gemeinsam aktualisiert werden: Cleanup/Recovery benötigen den geschützten neuen `/jobs`-Endpunkt.
- Die neue Tabelle `WithdrawalReceipt` muss mit dem Schema-Push beim Containerstart angelegt werden. Keine destruktive Datenverlust-Freigabe erforderlich. Backup vor Deployment; bei Schemafehlern startet die Anwendung absichtlich nicht.
- Datum und Inhalte des Releaseeintrags vor tatsächlichem Deployment abgleichen. Auf dem Server steht weiterhin der vorige Stand, bis ein autorisiertes Deployment erfolgreich ist.
