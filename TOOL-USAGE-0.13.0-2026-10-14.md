# Tool-Nutzungsstatistik – vorbereitet für 0.13.0

Noch nicht deployed. Die Zählung beginnt erst mit der Aktivierung dieses Builds.

## Anzeige

- Adminbereich: eigener Abschnitt mit 7/30/90 Tagen, Aktualisierung, vier Kennzahlen, Tagesverlauf und Tabelle aller zehn Tools.
- Deutsch/Englisch für den neuen Abschnitt; übrige bestehende Admin-Oberfläche unverändert.
- Vorgänge sind vom Browser gemeldete Verarbeitungsphasen, keine Seitenaufrufe oder eindeutigen Nutzer. Ein Tool kann mehrere Phasen haben: Dekodierung, Analyse, Codec-Vorschau und Export. Album-Analyse zählt pro Durchlauf, nicht pro Datei.
- Ergebnisse, teilweise Ergebnisse, Fehler, beendet ohne Ergebnis und unbestätigte Vorgänge werden getrennt angezeigt. Vorbereitungen ohne finalen Export gehören zu „Ohne Ergebnis“. Unbestätigt bedeutet nicht automatisch Fehler.

## Speicherung und Grenzen

- Additive Tabelle `ToolUsage`: zufällige UUID pro Vorgang, Tool-Schlüssel, Berliner Kalendertag, Status. Keine Kontoverknüpfung, IP-Adresse, Audio-, Mess- oder Dateidaten in dieser Tabelle.
- Gemeinsame Statuskomponente erfasst ausschließlich ihren Feedback-Teil. Der zweite Empfehlungs-Teil zählt nicht erneut. Start/Abschluss werden sequenziell gesendet; doppelte Starts und Abschlussmeldungen zählen nicht doppelt. Erste gültige Abschlussmeldung gewinnt.
- Versand ohne Cookies, ohne Browser-Speicherung, best effort mit 5 Sekunden Timeout. Statistikfehler blockieren keine Audioverarbeitung. Bestehende Serverlogs bleiben getrennt und können IP-Adressen enthalten.
- Rollendes 90-Kalendertage-Fenster. Bereinigung bei Statistikzugriffen, höchstens einmal pro Stunde. Ohne Zugriffe kann die physische Löschung später erfolgen.
- Schreib-API: Origin-Prüfung, maximale JSON-Größe 512 Byte, feste Tool/Status-Allowlist und globale Begrenzung. Lese-API: bestehender Admin-/Kontocheck, feste Zeiträume, private/no-store.
- Browsermeldungen sind weder manipulationssicher noch vollständig. Netzverlust, Browserblocker, sehr schnelle Zustandswechsel oder fehlende Schlussmeldung können Lücken verursachen. Keine Abrechnung oder verifizierte DSP-Fehlerrate daraus ableiten.
- Keine rückwirkenden Nutzungszahlen und keine personenbezogenen Nutzungsprofile.
- Datenschutzhinweise und Versionshistorie in Deutsch und Englisch angepasst.

## Prüfung

- `scripts/tool-usage-tests.cjs`: echte isolierte SQLite-Datenbank, Bereinigung, Duplikate, Statusübergänge, Berliner Tagesgrenze, geschützte API, Adminzugriff, Origin/Validierung und ausgeführte Client-Hook-Effekte.
- TypeScript, Produktionsbuild und bestehende Guidance-/Bibliotheks-, Account-Sicherheits-, Tool-Qualitäts- und Registrierungsmailtests bestanden. Kein echter Mailversand, keine Produktionsdaten verwendet.
- Nach Deploy: mit normalem Konto API-Zugriff ablehnen lassen; als Admin Übersicht öffnen; einen lokalen und einen serverseitigen Tool-Vorgang durchführen, aktualisieren und Zähler prüfen. Fehlermeldung/Teilresultat testen. Audio-Ergebnis und Download bleiben weiterhin getrennte Funktionsprüfungen.
