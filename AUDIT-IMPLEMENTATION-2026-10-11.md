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
- Angemeldete Browser-/Mobiltests der neuen Kontoeinstellungen und Online-Test des geänderten Silence Normalizers nach gemeinsamem Node-/Python-Deployment.
- Gemeinsames Budget für FFmpeg-Codec-Rendering und DSP sowie schmaler Peak-/Loudness-Endpunkt.
- Englisch im AuthModal/Profil und konsistenter OAuth-AGB-Nachweis. Neue Sicherheitsfehlertexte sind zweisprachig; das bestehende Profil bleibt vorerst deutsch.
- Web-Worker-Export, Animationen nur sichtbar/bei Bedarf zeichnen, weitere Multipart-/RAM-Budgetierung und mobiles Profiling.
- Synthetischer DSP-Funktionstest im Deployment zusätzlich zur Erreichbarkeitsprüfung. Readiness-Polling ist umgesetzt; Docker-Linux-Start/Neustart und Rollback praktisch testen.

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

## Fortsetzung: Kontosicherheit (0.9.1 lokal vorbereitet)

- Live-Stand 0.9.0 nach gemeldetem Deployment geprüft: `/api/health`, `/versionen`, `/en/updates`, `/in-eigener-sache` und `/en/support` liefern HTTP 200; alle vier HTML-Seiten zeigen 0.9.0. Kein Versand-/Login-Test damit verbunden.
- PATCH und DELETE verwenden begrenzte JSON-Anfragen mit Origin-Prüfung. Konto-ID und Passwortversion werden vor Änderungen unmittelbar gegen die Datenbank geprüft, nicht erst beim regelmäßigen Session-Check.
- Passwortänderung und 2FA-Änderung verlangen das aktuelle Passwort. Bei bereits aktiver 2FA ist ein nicht abgelaufener E-Mail-Code erforderlich; Verbrauch und Änderung erfolgen gemeinsam in einer Transaktion. Fehlgeschlagene Änderungen verbrauchen den Code nicht. Versuche sind begrenzt.
- Passwortänderung löscht offene Reset-Links und Codes; Oberfläche meldet danach ab. Credentials-Login übernimmt die Passwortversion zum Zeitpunkt der Passwortprüfung, damit ein gleichzeitig erfolgter Reset keinen Login mit altem Passwort legitimiert.
- Kontolöschung bei Passwort-Konten ebenso bestätigt. Google-only-Konten benötigen eine höchstens fünf Minuten alte Google-Anmeldung; Auswahl des Google-Kontos und Rückkehr zur Löschbestätigung sind in der Oberfläche vorgesehen. Dies erzwingt keine neue Google-Passworteingabe, sondern bestätigt die Identität über den Anbieter.
- Kontolöschung blockiert ausstehende/laufende Masters und aktive DSP-Worker; unbekannter Worker-Zustand meldet 503. Datenbanklöschung vor Dateilöschung, damit ein Transaktionsfehler keine Audiodateien zerstört. Fehlgeschlagene Dateilöschung wird protokolliert und als ausstehende Bereinigung gemeldet; reguläre Orphan-Bereinigung bleibt nötig.
- Passende Passwort-/Code-Eingaben, Versandknopf, Fehleranzeige und Sperre während laufender Bestätigungsanfragen im Profil. Löschhinweis berücksichtigt unabhängige, gesetzlich aufzubewahrende Nachweise.
- 18 isolierte Kontosicherheits-Regressionstests bestehen, darunter alte Sitzungen, fehlende/falsche/abgelaufene Codes, Einmalverbrauch, Rollback, Google-Frist, aktive Jobs, Worker-Ausfall, Reihenfolge von DB-/Dateilöschung und erkennbare Dateisystemfehler. Login-Reset-Rennen und unveränderliche Anbieter-Anmeldezeit ebenfalls geprüft. Zusammen mit den bestehenden 14 Node-Tests: 32 erfolgreiche Regressionstests. Gemockte Transaktionen ersetzen keinen echten SQLite-Concurrency- oder Google-End-to-End-Test.
- Dieser Folgestand ist noch nicht deployed. Öffentliche Release-Texte für 0.9.1 in Deutsch und Englisch vorbereitet; Datum vor dem Deployment prüfen.
- Finaler Produktionsbuild für diesen Folgestand erfolgreich (104 Seiten), TypeScript und `git diff --check` bestanden. Bestehende Edge-Runtime-Deprecation bleibt offen. Keine echten Konten gelöscht oder Sicherheitscodes per E-Mail versendet. Google-Login und Profilbedienung im angemeldeten Browser müssen noch praktisch geprüft werden.

## Fortsetzung: Silence Normalizer und Ablauf-Erklärung (ebenfalls 0.9.1)

- Die bislang benutzte Lautheit des gesamten Originaltracks bestimmt den Gain nicht mehr. Der Server schneidet den gewählten Bereich, setzt symmetrische 10-ms-Fades und misst anschließend LUFS und True Peak ausschließlich dieses Ausschnitts.
- Gain ist auf −1 dBTP begrenzt, auch bei bereits übersteuerten Float-Dateien und negativem gewünschtem Gain. Kein versteckter Limiter oder Kompressor. Nach dem 24-Bit-Export mit blockweisem TPDF-Dither wird die tatsächliche WAV erneut gemessen; bei Bedarf wird der Gain anhand dieser Messung korrigiert und das Ergebnis nochmals geprüft.
- Oberfläche zeigt gemessene Ausschnitt-Lautheit, tatsächlichen Gain, erreichte WAV-Lautheit, WAV-True-Peak und Ausgabedauer. Ein pegelbedingt unerreichbares Ziel wird erklärt. Neue Einstellungen entfernen alte Ergebnisse und Downloadlinks; während der Berechnung bleiben Parameter gesperrt. Lautlose/zu kurze Ausschnitte erhalten keine erfundenen Messwerte.
- Eigener interner, per Service-Token geschützter `/trim-normalize`-Endpunkt nutzt den bestehenden DSP-Slot und hält ihn auch bei Abbruch bis zum Worker-Ende. Keine vollständige BPM-/Tonart-/Spektralanalyse mehr nötig. Python erzeugt/verifiziert den Export und räumt seine isolierten temporären Ausgabedateien selbst auf.
- Öffentliche `/api/silence-normalize`-Route begrenzt tatsächliche Multipart-Bytes (auch ohne Content-Length), zwei gleichzeitige Anfragen pro Node-Prozess und ein globales Stundenlimit. Ursprung, Dateisignatur, Schnittpunkte und Ergebniswerte werden geprüft. Temporärer Originalupload wird nach Verarbeitung entfernt. Das ersetzt noch kein gemeinsames FFmpeg-/DSP-Budget für alle übrigen Tools.
- Grenzen offen angezeigt: Original bis 40 MB/10 Minuten, mindestens 0,4 Sekunden für LUFS, ausgewählter Ausschnitt bis 32 Millionen Kanal-Samples (ca. 5,5 Minuten Stereo bei 48 kHz). Höhere Abtastraten verkürzen die zulässige Auswahl. Server verarbeitet den Original-Ausschnitt in dessen nativer Abtastrate. Rendering erfolgt nun serverseitig, nicht allein im Browser; dies wird am Tool erklärt.
- Neuer zweisprachiger Hinweis unter dem Ablauf der Startseite und der Features-Seite erklärt optionales manuelles Nachjustieren nach dem Auto-Mastering, Live-Vorschau und erneutes Rendern. Vorschau und endgültiger Export werden ausdrücklich unterschieden. Bestehende Mastering-Funktionen unverändert.
- Neue Tests umfassen echte WAV-/FLAC-Normalisierung, Abschnitt statt Gesamttrack, Randfades, 44,1-kHz-Erhalt, Stereo/PCM24, Nachmessung der exportierten Bytes, Spitzenpegel auch bei negativer Verstärkung, Silence-/Bereichs-/Speicherfehler und DSP-Slot-Erhalt bei tatsächlichem Routenabbruch. Zehn gemockte öffentliche API-Tests prüfen zusätzlich echte Upload-Byte-Grenze, Origin, ungültige Multipart-Anfrage, Validierung, Überlastung, Bereinigung und deutsche Fehlermeldung.
- Kein Deployment und kein Live-Audiotest dieses Folgestands. Node und Python müssen gemeinsam deployed werden, da die neue Oberfläche den neuen internen Endpunkt verwendet.
- Abschlussprüfung: 27 Python-Tests und 42 Node-Regressionstests bestehen (69 insgesamt). TypeScript, Produktionsbuild (105 Routen/Seiten) und Diff-Prüfung erfolgreich. Keine neuen Build-Warnungen; bestehende Edge-Runtime-Deprecation bleibt offen. SQLite-/Google-/Mobile-End-to-End-Tests wurden in dieser Fortsetzung nicht durchgeführt.
