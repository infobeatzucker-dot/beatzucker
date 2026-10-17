# 0.21.0 – echte Hörvergleiche als eigenständiger Inhalt

Vorbereitet am 17./18. Oktober 2026, noch nicht deployed. Kein automatischer Git-Push oder Serverumbau.

## Umgesetzt

- Neue öffentliche Seiten `/hoervergleich` und `/en/mastering-examples`: gleiche aktuelle Hörbeispiel-Sammlung wie die Admin-Verwaltung, keine zweite manuell gepflegte Liste.
- Titel, Genre, Ausschnittgrenzen, tatsächlich gemessene LUFS-/True-Peak-/Crest-Werte und direkte Hörprobenlinks stehen im serverseitig gelieferten HTML. Der vorhandene A/B-Player erhält genau diese Daten; Originalpegel bleibt Standard, Lautheitsabgleich optional. Kein zusätzlicher Listenabruf auf dieser Seite und keine automatische Wiedergabe.
- Sichtbare Hörhinweise erklären Klangbalance, Anschläge, Lautheit und Messgrenzen. Die Angaben beziehen sich ausdrücklich nur auf 24 Sekunden und MP3-Hörproben, nicht auf vollständige Songs oder verlustfreie Vergleichstests. Keine erfundenen Hörurteile, Bewertungen, Fachprofile oder Erfolgsgarantien.
- Aktuelle Admin-Änderungen werden beim nächsten Seitenabruf serverseitig gelesen. Die Seiten sind dynamisch, nicht mit einer alten Beispiel-Sammlung vorgerendert. Bei Datenbankfehlern wird keine entfernte Sammlung als scheinbar aktuelle Ersatzliste angezeigt.
- Eigene Metadaten, Canonicals, gegenseitige DE-/EN-Sprachverweise und sichtbarer Sprachwechsel. CollectionPage, BreadcrumbList und ItemList/MusicRecording/AudioObject beschreiben nur sichtbare Inhalte. Kein Anspruch auf ein spezielles Google-Audio-Rich-Result.
- Kontextlinks von Startseiten-Hörvergleich, passenden Wissensartikeln und Praxisübersichten; zusätzliche Footerlinks. Links zu LUFS, Mixing/Mastering, True Peak und Streaming-Vorschau führen zurück zu hilfreichen vorhandenen Inhalten.
- Sitemap um beide Sprachseiten erweitert: 74 eindeutige öffentliche URLs. Keine pauschale Aktualisierung alter Artikel-/Rechtstext-Daten. Neue sichtbare Version und öffentliche Historie enthalten nur Endnutzer-Vorteile.
- Kein neuer DSP, keine Audio-Neuberechnung, keine Upload-/Anmelde-/Download-/Kontingentänderung. Kein neues Datenbankschema.

## Prüfungen

- Produktionsbuild einschließlich TypeScript erfolgreich; neue Seiten als dynamische Routen ausgewiesen.
- Vollständiger lokaler Audit inklusive aller bisherigen Node-Suites, 93 Python-Tests und DSP-Selbsttest erfolgreich. Bekannte Warnungen der synthetischen Testsignale sind kein fehlgeschlagener Test.
- Drei neue Rendering-/SEO-Testgruppen: DE/EN-HTML und Messwerte, aktuelle Sammlungen, 1–5 Beispiele, sichere Text-/JSON-Escapes, kein falscher Fallback, Sprachpaare und vorhandener Originalpegel-Standard.
- Echte HTTP-Prüfungen gegen separate lokale SQLite-/QA-Instanz: zusätzliche fünfte Metadaten-Fixture auf beiden Seiten sichtbar; Änderungen ohne Build sichtbar; Fixture anschließend zurückgesetzt; bestehende Adminroute ohne Anmeldung weiterhin 403.
- Alle 74 Sitemap-Seiten: 200, eigene Canonicals/OG-Adressen und lokalisierte Metadaten, gegenseitige Sprachverweise, parsebare strukturierte Daten. Zusätzlich 18 Tool-H1s, vier echte 404-Antworten und sichtbare Startseiten geprüft.
- Keine Produktionskonten oder Produktions-Audiodaten verändert, keine E-Mails versendet. Keine manuelle Browser-/Hörprüfung oder mobile Lighthouse-/Feldmessung behauptet.

## Zusätzlich live gefunden – inzwischen behoben

Abschluss am 18. Oktober 2026: Der Betreiber hat die Webgo-Ziele korrigiert und die schmale www-Regel im bestehenden Nginx-VHost angewendet. Öffentliche Nachprüfung: alle zwölf Kombinationen aus drei Alias-Hosts, HTTP/HTTPS und Startseite/Unterpfad mit Query führen mit genau einer permanenten Weiterleitung auf HTTPS ohne www. Pfad und Parameter bleiben erhalten; alle Ziele sowie deutsche/englische Startseite und `/api/health` antworten mit 200. Nginx-Sicherung: `/etc/nginx/beatzucker-before-www.gg_oscem`. Diese Serverkorrektur ist bereits live und benötigt keinen Anwendungsdeploy. Folgende Befunde dokumentieren den früheren Zustand.

Schreibgeschützte Stichprobe mit `redirect: manual`, Pfad `/en/tools?seo-check=1`:

| Host | Antwort | Location |
|---|---|---|
| `https://www.beatzucker.de` | 200 | keine Weiterleitung |
| `https://re-beatz.com` | 301 | `https://beatzucker.deen/tools?seo-check=1` |
| `https://www.re-beatz.com` | 301 | `https://www.beatzucker.deen/tools?seo-check=1` |

Den beiden alten Domains fehlt der Schrägstrich zwischen Zielhost und Pfad. Das ist bei dieser Stichprobe ein tatsächlich falsches Ziel, kein vermuteter Rankingverlust. Ort der Weiterleitung (DomainFactory-Menü oder Nginx) muss vor einer Änderung geklärt werden. Keine fremden Domains aufrufen oder registrieren. Serverkonfiguration, Zertifikate und Upmado wurden nicht verändert.

Danach bevorzugte Hauptdomain ohne www mit erhaltenem Pfad und Query testen. Unbekannte alte Pfade nicht pauschal als passende neue Inhalte darstellen; erwartete 404 respektieren.

## Nächste belastbare Schritte

1. Weiterleitungsort vom Betreiber bestätigen lassen, eng begrenzt korrigieren und HTTP/HTTPS, www/non-www, Pfade und Query testen. Bei Nginx vor Reload sichern und `nginx -t` ausführen.
2. Nach autorisiertem Deploy neue DE-/EN-Seiten, aktuelle Beispiele und Sitemap live prüfen. Änderungen in der Admin-Sammlung nur mit ausdrücklich entbehrlichen/eigenen Beispielen testen.
3. Search Console: Seitenindexierung, Sitemap-Verarbeitung, Google-Canonical und tatsächliche Suchanfragen auswerten. Keine Zugangsdaten im Chat, Screenshots/Exporte genügen. Kein belegter Traffic-/Rankingzuwachs und keine Indexierungsgarantie.
4. Mobile Leistung messen, dann nur belegte Engpässe bearbeiten. Prüfung der historischen Bewertungen/Publikationsdaten bleibt wie zuvor vom Betreiber zurückgestellt. Die bekannte globale HTML-lang-Lösung wurde nicht umgebaut; die neue Seite kennzeichnet ihren eigenen Inhaltsbereich zusätzlich mit der richtigen Sprache.

## Verwendete Primärquellen

- Kontextuelle, crawlbare interne Links: https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- Wahrheitsgemäße Sitemap-Daten: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Strukturierte Daten müssen sichtbare Inhalte beschreiben: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- Kanonische Varianten und dauerhafte Weiterleitungen: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
