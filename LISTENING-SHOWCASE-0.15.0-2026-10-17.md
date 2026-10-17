# Echter Mastering-Hörvergleich – vorbereitet für 0.15.0

## Verwendete Dateien

Vom Nutzer ausdrücklich für die Website bereitgestellt:

- Xplore Belgium.wav → Original, Pop.
- beatzucker_Xplore_Belgium_mp3320.mp3 → bereitgestellter Master.
- Back to My Acid.wav → Original, Electronic/Club.
- beatzucker_Back_to_My_Acid_mp3320.mp3 → bereitgestellter Master.

Keine Quelldatei verändert. Es werden nur vier kurze Ausschnitte veröffentlicht, keine vollständigen Songs. Das aktuell eingesetzte DSP wurde nicht erneut auf die Beispiele angewendet; die Master stammen aus den gelieferten Dateien, nicht aus einem behaupteten neuen Mastering-Lauf.

## Ausschnitte und Aufbereitung

| Track | Ausschnitt im Original | Master-Zeitkorrektur | Original / Master LUFS | Original / Master True Peak |
|---|---|---|---|---|
| Xplore Belgium | 0:48–1:12 | +288 Samples bei 48 kHz | −13.30 / −10.12 | −2.76 / −1.15 dBTP |
| Back to My Acid | 2:00–2:24 | +272 Samples bei 48 kHz | −16.61 / −10.39 | −7.34 / −1.19 dBTP |

- 24 Sekunden pro Datei, Stereo, 48 kHz, MP3 320 kbit/s. Jede Datei 961,964 Bytes, insgesamt etwa 3.85 MB. Beide Dateien des gewählten Beispiels werden erst beim Start angefordert.
- Zeitkorrektur aus normalisierter Kreuzkorrelation eines Ankers mit Suchbereich ±250 ms. Spitzenkorrelationen 0.6912 und 0.6571; keine Behauptung von Phasengleichheit nach der DSP-Kette.
- Beide Seiten mit gleichen Encoder-Einstellungen und 12-ms-Randblenden. Kein EQ, keine zusätzliche Kompression, keine versteckte Verbesserung und keine eingebrannte Lautheitsnormalisierung.
- Originalquelle WAV, Masterquelle bereits MP3. Master wird für die Ausschnittbereitstellung erneut codiert. Daher ausdrücklich kein verlustfreier Vergleich; Erklärung steht auch DE/EN auf der Webseite.
- Messwerte und 128 Wellenform-Peaks pro Datei werden aus den tatsächlich bereitgestellten, wieder dekodierten MP3-Ausschnitten bestimmt. Sie beschreiben nicht die Gesamttracks. Crest ist ein Peak-/RMS-Abstand, kein erfundener DR-Gewinn.
- Reproduzierbares Vorbereitungsprogramm: scripts/prepare-showcase-audio.py. Private Quellpfade und SHA-256-Provenienz liegen nur unter ignoriertem validation-output/showcase/provenance.json. Öffentliche JSON-Datei enthält keine lokalen Pfade.

## Wiedergabe und Grafik

- Zwei Songkarten mit eigenen grafischen Akzenten, responsive Studio-Konsole, Original-/Master-Umschalter, einfache Zeitposition, gemessene Wellenformen und echter FFT-Analyser.
- A/B verwendet zwei AudioBufferSourceNodes auf derselben AudioContext-Zeitachse. Wechsel verändert nur Gain mit kurzem Übergang, nicht Dateiposition oder Netzwerkquelle.
- Originalpegel ist auf Nutzerwunsch standardmäßig aktiv und behält den ursprünglichen Lautheitsunterschied bei. Optionaler Lautheitsabgleich: Master bei Pop um 3.18 dB, bei Club um 6.22 dB abgesenkt; Original bleibt in diesen Beispielen unverändert. Berechnung berücksichtigt gemeinsame Peak-Reserve. Keine pauschale Aussage, eine Seite klinge besser.
- Wellenformdarstellung berücksichtigt den gewählten Wiedergabe-Gain und einen gemeinsamen Maßstab. Keine Sinus-/Zufallswellenform oder fiktiven Instrumente.
- Live-FFT nur bei tatsächlicher Wiedergabe, Animation gedrosselt und bei verdecktem/offscreen Canvas gestoppt. Reduzierte Bewegung berücksichtigt. Keine automatische Wiedergabe beim Seitenaufruf.
- Pause, Positionswechsel, Abbruch während Laden, Songwechsel und Unmount räumen Sources/Context auf. Caching beschränkt sich auf das aktuelle Paar; der Hauptplayer wird beim Start gestoppt, ein startender Hauptplayer pausiert die Hörprobe.
- Deutsche und englische Beschriftungen, Tastaturbedienung über native Buttons/Range, Status-/Fehleranzeigen und direkte Audio-Links im Fehlerfall.
- Vorherige rein illustrative Vergleichskomponente ersetzt. Vier AudioObject-Einträge beschreiben nur diese Ausschnitte, keine erfundenen Bewertungen oder Autorennamen.

## Verifikation

- scripts/showcase-tests.cjs: sechs vollständige Gruppen, mit Watchdog gegen unbemerkt hängende Tests. Prüft Assets/Matching, gemeinsame Startzeit, Wechsel ohne Reload, Pause/Cache/Seek, Ende, Abbruch während Laden, Wiederholung nach Fehler und Aufräumen.
- python/tests/test_showcase_assets.py: alle vier öffentlich vorbereiteten MP3-Dateien erneut dekodiert; Samplezahl, Stereo/48 kHz, LUFS, True Peak, Crest und alle Wellenform-Peaks gegen Manifest geprüft.
- Vollständiger Auditlauf inklusive 75 Python-Tests und DSP-Selbsttest erfolgreich.
- Produktionsbuild nach letzter CSS-Lesbarkeitsanpassung erneut erfolgreich, einschließlich TypeScript und 111 statisch erzeugter Seiten.
- scripts/showcase-http-tests.cjs: sechs echte HTTP-Prüfungen erfolgreich. DE-/EN-HTML, AudioObject-Einträge, tatsächlich ausgelieferte Bytes aller vier MP3s, MIME-Typ und Byte-Range-Antworten geprüft. Auch alle 72 SEO-Seitenprüfungen einschließlich zusätzlicher Frontend-/404-Prüfungen weiterhin erfolgreich.
- Automatische visuelle Browser-/Audio-Interaktionsprüfung war hier nicht möglich: Computer-Use/Browser-Anbindung meldet auch nach Reset „failed to write kernel assets … os error 3“. Keine Behauptung, Screenshot oder Hörtest abgeschlossen zu haben. Lokale Vorschau zum manuellen Prüfen bereitstellen.
- Lokale isolierte Vorschau für den Nutzer: http://127.0.0.1:3013/#before-after. Keine Anmeldung nötig. Nach dem manuellen Test kann diese eigene Vorschau beendet werden; produktive Dienste bleiben unberührt.

## Release- und Serverstatus

Teil des noch nicht veröffentlichten Pakets 0.15.0 zusammen mit den SEO-Korrekturen. Keine zusätzliche erfundene Veröffentlichung für diesen Zwischenschritt. Keine Serverkonfiguration, produktiven Nutzerkonten, privaten Uploads oder Mastering-Routinen geändert. Auditpunkt 3 bleibt zurückgestellt. Noch nicht deployed.
