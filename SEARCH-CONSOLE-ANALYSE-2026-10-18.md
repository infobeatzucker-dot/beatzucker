# Search Console und Webgo – Auswertung vom 18. Oktober 2026

Nur Analyse und öffentliche Leseprüfungen. Keine Änderungen an Originalexport, Anwendung, Hosting, DNS oder Weiterleitungen. Bereits vorbereitete 0.21.0-Änderungen bleiben unberührt und sind weiterhin nicht deployed.

## Quellen und Umfang

- Nutzerexport `https___beatzucker.de_-Performance-on-Search-2026-10-18.zip`: sieben CSVs, Suchtyp Web, Filter „Letzte 3 Monate“. Tatsächlich enthaltene Tagesdaten: 16.07.2026–15.10.2026, 92 Tage.
- Diagramm 92 Zeilen, Suchanfragen 226, Seiten 56, Länder 73, Geräte 3; Darstellung in der Suche ohne Datenzeilen.
- Nutzer-Screenshots: Indexierung 70 indexiert, 3 nicht indexiert, 2 Gründe. Die Gründe und betroffenen URLs sind nicht abgebildet. Leistungsübersicht deckt sich mit dem Export.
- Webgo-Screenshot: `re-beatz.com` → `https://beatzucker.de`, `www.re-beatz.com` → `https://www.beatzucker.de`, jeweils ohne abschließenden Schrägstrich. Die genaue Bearbeitungsmaske ist nicht abgebildet.
- CSVs wurden im Speicher gelesen, Zahlen als Zahlen ausgewertet; keine Änderungen oder neue Arbeitsmappe. Keine Zugangsdaten benötigt.

## Kennzahlen

| Zeitraum/Dimension | Klicks | Impressionen | CTR | Ø Position |
|---|---:|---:|---:|---:|
| Gesamter Zeitraum, Diagramm | 9 | 2.043 | 0,44 % | 55,05 |
| August | 6 | 1.571 | 0,38 % | 61,15 |
| September | 1 | 317 | 0,32 % | 45,60 |
| 01.–15. Oktober | 2 | 155 | 1,29 % | 12,56 |
| 21.08.–17.09., 28 Tage | 7 | 1.734 | 0,40 % | 60,65 |
| 18.09.–15.10., 28 Tage | 2 | 238 | 0,84 % | 14,54 |

CTR = Summe Klicks / Summe Impressionen. Ø Position aus Tagesdaten nach Impressionen gewichtet; die Tagespositionen sind bereits gerundet, daher nur Näherung des ungerundeten Gesamtwerts. Keine ungewichteten Mittelwerte oder Summen von Prozenten verwendet.

Reichweite ist nach dem August-Hoch geringer. Die bessere spätere Durchschnittsposition belegt keine vergleichbare Rankingsteigerung derselben Keywords: Zeiträume können andere Suchanfragen, Länder, Seiten und Geräte enthalten. Neun Klicks insgesamt erlauben keine robusten Erfolgsprognosen. Der Export endet vor den Deployments vom 17. Oktober und der noch unveröffentlichten Hörvergleichsseite.

### Abstimmung der Tabellen

- Länder und Geräte: jeweils 9 Klicks / 2.043 Impressionen, deckungsgleich mit dem Diagramm.
- Seiten: 9 Klicks / 2.185 Impressionen. Seitenbezogene Impressionen sind nicht mit Property-Impressionen gleichzusetzen: mehrere Seiten einer Property können in derselben Suche erscheinen.
- Sichtbare Suchanfragen: 0 Klicks / 1.314 Impressionen, nicht alle Property-Daten. Google blendet anonymisierte/seltene und weitere nicht gespeicherte Zeilen aus. Der Export erlaubt keine Zuordnung der 9 Klicks zu konkreten Suchbegriffen; nicht „keine organischen Klicks“ behaupten und fehlende Zeilen nicht erfinden.
- Geräte: Computer 6 Klicks/1.416 Impressionen; Mobil 2/604; Tablet 1/23. Keine belastbare Conversion- oder mobile Performanceaussage daraus.
- Deutschland: 4 Klicks/1.129 Impressionen. Keine Aussage über Registrierungen oder Masterings, diese Daten fehlen.

## Seiten mit möglichen Ansatzpunkten

Alle Werte über den gesamten Exportzeitraum, aggregiert über Suchanfragen. Position ist ausdrücklich kein Ranking für ein bestimmtes Hauptkeyword.

| Seite | Impressionen | Klicks | Ø Position | Ansatz |
|---|---:|---:|---:|---|
| DE Sample-Rate/Bittiefe | 57 | 0 | 9,04 | Suchanfragen pro Seite prüfen; Titel/Einleitung auf reale Entscheidungsfragen ausrichten |
| DE LUFS erklärt | 21 | 0 | 10,48 | Verständliche Kurzantwort, Streaming-Zusammenhang, passendes Tool und echter Hörvergleich |
| EN Stereo/Phase-Tool | 23 | 2 | 10,78 | Bestehenden Einstieg ausbauen, Grenzen der Messwerte und Anwendungsfall konkretisieren |
| DE True Peak/RMS/LUFS | 17 | 0 | 15,53 | Begriffe und typische Fehlinterpretationen gezielt beantworten |
| DE Mix fürs Mastering vorbereiten | 56 | 0 | 24,52 | Praktische Export-/Prüf-Checkliste und klarer Übergang zum Mix-Check |
| DE Mixing vs. Mastering | 716 | 0 | 59,91 | Größte Seitenreichweite, aber meist weit hinten; Suchintention und Inhalt prüfen, nicht nur Snippet umschreiben |
| EN Key/BPM-Tool | 335 | 0 | 76,11 | Deutlich hintere Positionen; kein Beleg für ein reines Titel-/CTR-Problem |

Der Vergleichsartikel EN hat 2 Klicks bei 11 Impressionen/Ø 11,64. Kleine Stichprobe und die zuvor zurückgestellte Prüfung aktueller Anbieterangaben erlauben keine unkritische Priorisierung dieses Artikels. Keine ungeprüften Preise/Überlegenheitsversprechen ergänzen.

## Auffällige Suchanfrage

`site:ursindia.com`: 46 Impressionen, 0 Klicks, Ø 1,11. Themenfremd und nicht als SEO-Ziel oder Erfolg zu behandeln. Die Startseite selbst hat 62 Impressionen/Ø 1,44; aus dem getrennten Seiten- und Suchanfragenexport lässt sich aber nicht beweisen, welche Anfrage zu welcher Seite gehört.

Die Zeichenfolge wurde weder in den mit Git erfassten Textquellen noch im öffentlich geladenen Homepage-HTML gefunden. Das ist eine begrenzte Leseprüfung, kein vollständiger Sicherheitsaudit und kein Nachweis für oder gegen einen früheren Angriff. Fremde Domain wurde nicht besucht. Betreiber soll Search Console → Sicherheitsprobleme und Manuelle Maßnahmen prüfen sowie die Suchanfrage anklicken und den Seiten-Tab ansehen. Nicht aufgrund einer einzelnen Anfrage eine Kompromittierung oder Bot-Manipulation behaupten.

## Webgo-Weiterleitung: bestätigter Fehler

Erneute öffentliche GETs ohne Weiterleitungsfolgen:

| Aufruf | Status | Location |
|---|---:|---|
| `https://re-beatz.com/` | 301 | `https://beatzucker.de` |
| `https://re-beatz.com/en/tools?seo-check=20261018` | 301 | `https://beatzucker.deen/tools?seo-check=20261018` |
| `https://www.re-beatz.com/` | 301 | `https://www.beatzucker.de` |
| `https://www.re-beatz.com/en/tools?seo-check=20261018` | 301 | `https://www.beatzucker.deen/tools?seo-check=20261018` |
| `https://www.beatzucker.de/` | 200 | keine Weiterleitung |
| `https://www.beatzucker.de/en/tools?seo-check=20261018` | 200 | keine Weiterleitung |

Die Screenshot-Ziele passen zum beobachteten Aneinanderhängen ohne Trennzeichen. Erste vorgeschlagene, eng begrenzte Korrektur in Webgo: für **beide alten Domainvarianten** Ziel `https://beatzucker.de/` setzen. Abschließenden Slash und einheitlich ohne www beachten. 301 beibehalten, sofern entsprechende Einstellung angeboten wird; keine Frame-Weiterleitung. Erst nach Speicherung öffentlich prüfen, ob Webgo Pfad und Query jetzt korrekt erhält. Die offizielle Anleitung bestätigt den Bearbeitungsort und beide Varianten, beschreibt aber nicht die konkrete Slash-Verkettung. Deshalb keine ungetestete Erfolgsgarantie.

Nicht DNS, Mail, Zertifikate, PHP-Version, Beatzucker-Container oder Upmado verändern. Die eigenständige www.beatzucker.de-Weiterleitung muss separat dort eingerichtet werden, wo diese Domain tatsächlich bedient wird. Keine alte Unterseite ohne fachlich passenden Nachfolger pauschal als korrekt migriert ausgeben.

## Empfohlene Reihenfolge

1. Beide Webgo-Ziele korrigieren lassen; HTTP/HTTPS, www/non-www, Startseite und Unterpfad mit Query schreibgeschützt nachtesten. Separat www.beatzucker.de auf die bevorzugte Hauptdomain vereinheitlichen.
2. Zwei fehlende Indexierungsgründe und Beispiel-URLs anfordern. Drei ausgeschlossene URLs sind nicht automatisch Fehler: noindex/Weiterleitungen können beabsichtigt sein. Sicherheitsberichte und auffällige Anfrage zusätzlich prüfen.
3. Vorbereitete Hörvergleichsseite nach Freigabe deployen; danach live prüfen und Sitemap bei Bedarf in Search Console einreichen. Keine automatische Deployment-Autorisierung aus dem Export ableiten.
4. Bestehende Seiten gezielt verbessern statt viele ähnliche neue Landingpages anzulegen. Zuerst Sample-Rate/Bittiefe, LUFS und Stereo/Phase, danach Mix-Vorbereitung und Mixing/Mastering. Pro relevanter Seite den Search-Console-Seitenfilter und kürzere aktuelle Zeiträume prüfen, um Titeländerungen nicht aus unpassenden globalen Suchanfragen abzuleiten.
5. Nach einigen Wochen vergleichbare Zeitfenster und möglichst dieselben Seiten/Suchanfragen beurteilen. Klicks/Impressionen und sinnvolle Nutzeraktionen auseinanderhalten. Keine Umsatz-, Ranking-, Zeit- oder Indexierungsversprechen.

## Nachprüfung nach Betreiber-Korrektur

Der Betreiber hat die Webgo-Ziele anschließend korrigiert. Alle acht öffentlichen Stichproben (HTTP/HTTPS, beide alten Hostnamen, Startseite sowie `/en/tools` mit Query) führen jetzt mit genau einer 301-Weiterleitung auf `https://beatzucker.de/` bzw. den erhaltenen Pfad und Parameter. Die Ziele liefern jeweils 200; kein Aufruf eines fremden Fehlziels nötig.

Separat weiterhin offen: `https://www.beatzucker.de/` und der geprüfte Unterpfad liefern noch 200 ohne Weiterleitung auf die bevorzugte Hauptdomain. Das ist nicht durch die Korrektur der beiden alten Domains behoben.

Neuer Screenshot 7 konkretisiert die drei nicht indexierten URLs: zwei „Gefunden – zurzeit nicht indexiert“, eine „Gecrawlt – zurzeit nicht indexiert“. noindex- und Duplikat-Kategorien stehen im Screenshot jeweils auf 0. Die drei URLs selbst fehlen weiterhin, deshalb keine konkrete technische oder inhaltliche Ursache zugewiesen. „Validierung nicht gestartet“ bedeutet nicht automatisch einen Anwendungsfehler. Als Nächstes die beiden Gründe öffnen und die Beispiel-URLs prüfen.

## Prüfung der anschließend genannten URLs

Der Betreiber hat die drei betroffenen Adressen nachgereicht:

- `/en/support`: 200, HTML, index/follow für Robots und Googlebot, eigener Canonical, passende DE-/EN-/x-default-Verweise, in Sitemap. Inhalt bereits im HTML vorhanden. Kein sichtbarer technischer Indexierungsblocker.
- `/en/updates`: 200, HTML, gleiche positiven Indexierungsprüfungen, in Sitemap, öffentliche nutzerbezogene Versionshistorie vorhanden. Kein sichtbarer technischer Indexierungsblocker.
- `/opengraph-image?f62df0564d9f49d9`: 200, `image/png`, 54.066 Bytes, nicht in der Sitemap. Dies ist das Link-Vorschaubild, keine fehlende Inhaltsseite. Seine fehlende Indexierung ist kein Grund, die Website umzubauen oder es als normale Landingpage aufzunehmen.

Die Zuordnung der einzelnen URLs zu „gefunden“ bzw. „gecrawlt“ wurde nicht separat belegt. Der Google-Bericht beweist bei diesen drei Adressen keinen allgemeinen Website-Blocker. Nicht versuchen, Indexierung aller Assets zu erzwingen. Die zwei englischen Inhaltsseiten haben für Nutzer einen Zweck, sind aber für Suchtraffic weniger wichtig als Audio-Tools und fachliche Ratgeber. Optional URL-Prüfung/Live-Test für die HTML-Seiten; keine wiederholten Indexierungsanträge als SEO-Strategie.

Bekannte Nebenbefunde bleiben getrennt: Root-HTML liefert zunächst `lang=de` und korrigiert im Browser die Sprache; Support-Title enthält den Markennamen doppelt. Daraus keinen belegten Indexierungsgrund ableiten. Weder Anwendungs-/Serverregeln noch die drei Seiten wurden bei dieser Prüfung verändert.

## Ursache der weiterhin ausbleibenden www-Weiterleitung

Screenshot 8 zeigt das richtige Webgo-Ziel `https://beatzucker.de/`. Aktuelle DNS-Leseprüfung: `www.beatzucker.de` und `beatzucker.de` zeigen beide per A-Record auf `92.205.237.227`, den bekannten Anwendungsserver. `re-beatz.com` zeigt dagegen auf `185.30.32.191`, wo die korrigierte Weiterleitung greift. Eine AAAA-Antwort für www wurde bei dieser Prüfung nicht geliefert.

Öffentliche HTTPS-Antwort für www: 200, Server nginx, `X-Powered-By: Next.js`, Next-Cache HIT, keine Location. Die Anfrage kommt damit beim Anwendungsserver an, nicht bei der Webgo-Hostingregel. Kein bloßes Browser-Cache-Problem und kein belegter Anlass, weitere Propagation abzuwarten. Empfohlene Lösung: schmal begrenzte www-Weiterleitung im tatsächlichen Nginx-VHost nach Lesen/Sichern der aktuellen Konfiguration. Hauptdomain-DNS, Hauptanwendung, Mail und Upmado unverändert lassen. Keine Serverregel ohne vorherige Konfigurationsprüfung ersetzen.

## Abschluss der Weiterleitungskorrektur

Am 18. Oktober 2026 hat der Betreiber die geprüfte www-Regel im bestehenden Nginx-VHost eingerichtet. Syntaxprüfung und Reload erfolgreich; Sicherung unter `/etc/nginx/beatzucker-before-www.gg_oscem`. Öffentliche Nachprüfung: alle zwölf Fälle für `www.beatzucker.de`, `re-beatz.com` und `www.re-beatz.com`, jeweils HTTP/HTTPS und Startseite/Unterpfad mit Query, führen direkt mit einer permanenten Weiterleitung auf HTTPS ohne www. Pfad und Query bleiben erhalten, Ziele liefern 200. Deutsche/englische Startseite und `/api/health` ebenfalls 200. Damit sind die zuvor dokumentierten Weiterleitungsprobleme behoben; kein Anwendungsdeploy dafür nötig. Die neue Hörvergleichsseite 0.21.0 ist davon getrennt noch zur Veröffentlichung vorbereitet.

## Primärquellen zur Interpretation

- Webgo, Domain-Weiterleitung: https://webgo.de/faq/domain-weiterleitung-webgo-einrichten
- Google, Suchanfragen/Anonymisierung und Dimensionen: https://support.google.com/webmasters/answer/17011259?hl=en
- Google, Property-/Seitenaggregation: https://support.google.com/webmasters/answer/17011364?hl=en
- Google, Canonicals und Weiterleitungen: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Google, Sicherheitsberichte: https://developers.google.com/search/docs/monitor-debug/search-console-start?hl=en
