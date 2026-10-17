# SEO-/Ratgeber-Korrekturen 0.15.0

Vorbereitet am 17. Oktober 2026. Noch nicht deployed.

## Umgesetzt

- Bisherigen re-beatz-Artikel durch einen aktuellen Beatzucker-Ratgeber zur manuellen Feinabstimmung ersetzt, vollständig Deutsch/Englisch. Bestehende URLs und interne Verweise bleiben erhalten. Expliziter Hinweis auf den eingestellten eigenständigen re-beatz-Dienst; keine alten Preview-, Preis- oder Überlegenheitsversprechen.
- Ratgeber unterscheidet Haupt-A/B, lokale Loop-Vorschau, optionalen Server-Kontrollrender und regulären neuen Gesamttrack-Master einschließlich Tageskontingent. Er erklärt Auswahl, kleine Eingriffe, Vergleich und abschließende Kontrolle.
- Vorhandenes Erstveröffentlichungsdatum unverändert übernommen, tatsächliches updatedAt auf 2026-10-17 gesetzt und auf beiden Artikelseiten sichtbar angezeigt. Die historischen Angaben anderer Artikel wurden nicht als verifiziert behandelt.
- Gemeinsamer Metadatenhelfer für 42 statische Exporte und beide dynamischen Artikelvorlagen. Seitenbezogene Open-Graph-/Twitter-Titel, Beschreibung, Adresse, Sprache und Bild-Fallback. Bestehende Canonicals, Sprachverweise, Indexierungsregeln und Artikelzeitpunkte bleiben erhalten.
- Root-Schema auf Organisation/Website begrenzt. Zweisprachiges WebApplication-Markup mit MultimediaApplication nur auf Mastering-Startseiten; bestehende Tool-Schemata bleiben erhalten. Keine erfundenen Bewertungen.
- Sitemap-Datum der inhaltlich geänderten Startseiten aktualisiert; Ratgeberdatum ergibt sich aus updatedAt. Kein pauschaler Datumswechsel für alle Seiten.
- Öffentliche Versionshistorie DE/EN und Paketversionen auf 0.15.0 vorbereitet.

## Erweiterung vor dem Deployment

- Neun Tool-Überschriften auf Deutsch/Englisch konkretisiert, ohne Analyse-/Renderingparameter zu ändern. Die neun Tool-Sprachpaare haben als Datum ihrer tatsächlich geänderten Inhalte den 17. Oktober; unveränderte Übersichten und Wissensartikel behalten ihre bisherigen Inhaltsdaten.
- Startseiten-Hero beginnt nicht mehr mit opacity:0. Der Produktionsbuild liefert den Haupttext bereits mit opacity:1 und ohne Verschiebung aus.
- DownloadPanel über React.lazy/Suspense erst beim fertigen Master-Ergebnis laden. Vorhandene AudioEngineProvider-Zuordnung, Autoplay-Trigger, Download-, Remaster- und Manuell-Callbacks bleiben erhalten. Ladehinweis ist DE/EN vorhanden.
- Community-Raster verwendet CSS-Media-Queries für 3/2/1 Spalten statt eines nachträglichen JavaScript-Fensterbreitenchecks. Namen, Texte, Sterne und historische Angaben bleiben unverändert. Die Prüfung ihrer Herkunft ist auf Nutzerwunsch zurückgestellt (Auditpunkt 3).
- Root-404-Metadaten nennen für Robots und Googlebot explizit noindex/nofollow. Unbekannte URL, fehlender DE-/EN-Artikel und Entwicklungsansicht liefern in den lokalen HTTP-Tests tatsächlich 404 ohne widersprechendes index-Tag.

### Performance-Messgrenzen

Im lokalen Produktionsbuild vor dieser Erweiterung waren 15 initial referenzierte JS-Dateien mit zusammen 963,745 Bytes dekodiert enthalten. Danach sind es weiterhin 15 Dateien mit 968,910 Bytes dekodiert. Der Gesamtumfang wurde also **nicht reduziert** (plus 5,165 Bytes). Die Download-Report-Aktion ist im neuen Build in separaten, nicht initial referenzierten Chunks enthalten. Das bestätigt die Code-Abtrennung, nicht eine bessere Gesamt-Ladezeit.

Dies sind statische Bundle-/HTML-Messungen, keine komprimierten Transfergrößen und keine mobilen LCP-/INP-/CLS-Werte. Keine Behauptung eines besseren Lighthouse-Scores. Für weitere Performance-Arbeit sind Browser-/Feldmessungen weiterhin erforderlich.

## Verifikation

- `node scripts/seo-metadata-tests.cjs`: fünf Testgruppen erfolgreich, einschließlich 42 statischer Metadaten-Exporte, DE/EN-Ratgeber, Erhalt von Adressen/Sprachverweisen/Datumsfeldern und passend platziertem App-Schema.
- `node scripts/run-audit-tests.cjs`: vollständig erfolgreich, einschließlich neuer SEO-Prüfungen, 74 Python-Tests und DSP-Selbsttest (Analyse, Mastering, WAV24, True Peak, MP3, AAC).
- `node node_modules/next/dist/bin/next build`: erfolgreich, 111 statische Seiten erzeugt, TypeScript erfolgreich.
- `BEATZUCKER_ISOLATED_QA=1 node scripts/seo-http-tests.cjs`: alle 72 Sitemap-Seiten des Produktionsbuilds lokal über HTTP erfolgreich geprüft. Seiteneigene Canonicals/OG-URLs, passende Beschreibungen, Twitter-Titel, Sprachverweise, keine noindex-Blockade öffentlicher Seiten, parsebare und passend platzierte strukturierte Daten sowie beide aktualisierten Ratgeber.
- `git diff --check`: erfolgreich.
- `node scripts/seo-frontend-tests.cjs`: vier zusätzliche Gruppen erfolgreich: tatsächliche DE-/EN-Überschriften, Lazy-Result-Einbindung und Callback-Erhalt, sofort sichtbarer Hero/CSS-Raster und explizite 404-Metadaten.
- Erweiterte lokale HTTP-Prüfungen: 18 Tool-Überschriften, DE-/EN-Hero und vier echte 404-Antworten erfolgreich; weiterhin alle 72 Sitemap-Seiten erfolgreich.
- `BEATZUCKER_ISOLATED_QA=1 node scripts/mastering-http-tests.cjs`: sechs echte lokale Integrationsprüfungen erfolgreich, einschließlich Auto-Master/Download, manuellem neuem Master/Download, PCM16-Ausschnitt und Server-Kontrollrender.
- Kein Zugriff auf Produktionskonten oder Audiomaterial, kein Mailversand. Die lokale QA verwendet ihre eigene Datenbank und eigenen Uploadordner.

## Bewusst noch offen

- www-/Altdomain-Weiterleitungen: erfordern getrennte Prüfung/Änderung der Serverkonfiguration.
- Herkunft/Freigabe der vorhandenen Erfahrungsberichte und historische Veröffentlichungsdaten: Betreiberklärung erforderlich, nicht neu erfunden oder als bestätigt dargestellt.
- Anbieter-Vergleich und übrige redaktionelle Quellen: zusammen mit Glaubwürdigkeitsprüfung zurückgestellt. Serverseitiges HTML-lang benötigt noch eine gesonderte Lösung; die bestehende frühe JavaScript-Sprachkorrektur bleibt unverändert.
- Mobile Performance, tatsächliche Indexierung/Google-Canonical und Suchanfragen: benötigen belastbare Messungen bzw. Search-Console-Daten. Keine Ranking- oder Rich-Result-Garantie.
- Keine neue Grafik; vorhandene Vorschaugrafik bleibt. Geändert wurden Texte, Hero-Einblendung und technische Umsetzung des responsiven Community-Rasters. Keine Änderungen an DSP, Audio-Engine, Anmeldung, Upload-/Mastering-APIs, Datenbankschema oder Deployment-Skripten.

Nach einem später autorisierten Deployment: Startseite/Versionen/englische Updates, beide Ratgeber und exemplarische geteilte Tool-/Artikellinks live prüfen. Neue Version nicht vor erfolgreichem Deployment als live bezeichnen.
