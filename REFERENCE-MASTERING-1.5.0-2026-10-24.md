# Referenz-Mastering 1.5.0 — vorbereitet, nicht deployed

## Umfang

- Bis zu drei Referenzen mit relativer Gewichtung; separate Regler für Einfluss, Bass, Helligkeit und Glättung. Vollständige deutsche und englische Bedienung.
- Neues 24-Band-Profil aus tatsächlich gemessenen aktiven FFT-Fenstern. Stereo-Leistung statt phasenauslöschender Monosumme; maximal 512 Fenster. Kein semantischer Refrain-Detektor.
- Relative Klangbalance statt Kopieren der Referenzlautheit. Kleine breite Profil-EQ-Eingriffe, deren zusammengesetzter Frequenzgang auf ±3 dB begrenzt wird. Bestehender Genre-EQ bleibt separat.
- Alte Einzelreferenzen, gespeicherte Analysen und deren Signaturen bleiben kompatibel. Feines Matching benötigt aktuelle Profile der Quelle und aller aktiven Referenzen; andernfalls kompatible grobe Anpassung mit Hinweis.
- 0 % Einfluss entspricht dem bisherigen Mastering ohne Referenz. Plattformziel und Peak-Grenzen bleiben unabhängig.
- Manuelle Feinabstimmung und Kontrollrender verwenden den Referenzstand des abgeschlossenen Masters. Änderungen der Auswahl gelten erst für den nächsten automatischen Lauf.
- Native Browser-Biquads übernehmen die neue Profil-Kurve. Die gesamte Browser-Vorschau ist weiterhin keine sampleidentische Kopie der kompletten Server-Kette.
- Quoten, Authentifizierung, private Downloads und übrige DSP-Stufen wurden nicht durch neue Algorithmen ersetzt.

## Sicherheitsupdate

- Mit ausdrücklicher Nutzerfreigabe Next.js 16.4.0 → 16.4.3 aktualisiert; keine übrigen Anwendungsabhängigkeiten gezielt angehoben.
- `npm audit --omit=dev --json`: 0 bekannte Schwachstellen am 24.10.2026 nach dem Update. Dies ist kein Beweis allgemeiner Angriffssicherheit und kein Befund zu früherer Ausnutzung.

## Durchgeführte Prüfungen

- Produktionsbuild mit Next.js 16.4.3 erfolgreich, einschließlich TypeScript und 128 statisch erzeugter Seiten.
- `scripts/run-audit-tests.cjs` mit vorhandenem portablem FFmpeg erfolgreich: alle Node-Regressionsgruppen, 112 Python-Tests und DSP-Selbsttest einschließlich WAV24, True-Peak, MP3, AAC und Sprachbereinigung.
- Sieben neue Python-Referenztests: Gain-/Stereo-Polaritätsinvarianz, stille Ränder, Gewichtung, fehlende Profile, Null-Einfluss, Frequenzganggrenzen bei 8–192 kHz und gemessene synthetische Klanganpassung.
- Isolierter HTTP-Test: drei echte synthetische Uploads und signierte Profile; gespeicherte Profile; Zwei-Referenz-Auto-/Manual-WAV-Export mit privatem Download, unveränderter Referenzkurve und erhaltenem manuellen Override; Kontroll-WAV; ungültige Nullgewichtung abgewiesen; 0-%-Bypass.
- Isoliertes Chrome-Profil: drei gespeicherte Referenzen laden, Slot-Grenze, Gewichtung, Einfluss und Entfernen; Deutsch/Englisch; kein horizontaler Überlauf bei 390 px. Screenshots visuell geprüft.
- Browser-/Server-Profil-EQ bei 48 kHz numerisch verglichen: maximal 0.00000285 dB Abweichung im getesteten Frequenzraster.
- Lokaler 20-Sekunden-Probelauf mit bereitgestelltem „On Tour“ und zwei Nutzerreferenzen: Ausgangsdateien unverändert; WAV24/MP3-Probeexporte erfolgreich. Beide WAV-Läufe erreichten das gewählte -14-LUFS-Ziel und blieben unter dem Peak-Limit. Kein kontrollierter subjektiver Blind-Hörtest durchgeführt; daher keine pauschale Überlegenheit behauptet.

## Reproduzieren

1. `npm run build`
2. Mit `FFMPEG_BINARY` auf einen vorhandenen FFmpeg-Pfad: `node scripts/run-audit-tests.cjs`.
3. `node scripts/run-tools-qa.cjs` startet ausschließlich die lokale Fixture auf 127.0.0.1:3013/8013 mit eigener SQLite-Datei und leeren Mail-Schlüsseln. Auf `/api/health` mit `{"status":"ok"}` warten.
4. Mit `BEATZUCKER_ISOLATED_QA=1` und gegebenenfalls `PLAYWRIGHT_MODULE` auf eine vorhandene Playwright-Installation: `node scripts/reference-mastering-http-qa.cjs`.
5. Testartefakte liegen ausschließlich im ignorierten `validation-output/reference-mastering-1.5/`. Keine produktiven Konten, E-Mails oder Audiodateien wurden für diese HTTP-Tests verwendet.

## Noch nicht erledigt

- Kein Commit, Push oder Deployment in diesem Arbeitsschritt. Live-Version bleibt unverändert.
- Vor Freigabe empfohlen: subjektiver Hörvergleich mit passenden Genre-Referenzen, idealerweise bei abgeglichener Lautheit. Das Referenzprofil ersetzt keine Mixkorrektur.
- Dieser Bericht beschreibt den Referenzteil. Die danach autorisierten Arbeiten an dynamischem EQ und Limiter werden separat in `DYNAMIC-EQ-LIMITER-1.5.0-2026-10-24.md` dokumentiert.
