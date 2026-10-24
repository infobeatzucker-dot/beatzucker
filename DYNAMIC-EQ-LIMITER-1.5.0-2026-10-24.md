# A/B-Standard, dynamischer EQ und Limiter — lokal vorbereitet

Stand 24.10.2026. Ergänzung zum Referenz-Mastering im noch unveröffentlichten Release 1.5.0. Kein Commit, Push oder Deployment in diesem Arbeitsschritt.

## A/B

- React-Zustand und unmittelbare Audio-Referenz starten beide mit ausgeschaltetem Lautheitsabgleich. Die Option bleibt bedienbar; vorhandene Ein-/Ausblendung des Gains und Autostart bleiben erhalten.
- Tatsächlicher Provider-Test prüft den Standard und Ein-/Ausschalten. Der isolierte Chrome-Test lädt eine echte synthetische Audiodatei und bestätigt denselben Schalterzustand in der Oberfläche.

## Dynamischer EQ

- Zwei feste, breite Regionen bei 280 Hz und 3.2 kHz. Das ist keine automatische Suche nach beliebigen Resonanzfrequenzen.
- Stereo-verknüpfte Leistungsdetektoren vergleichen momentane regionale Dominanz mit einer Zwei-Sekunden-Historie. Keine phasenauslöschende Monosumme, kein Stereo-Panning durch getrennte Gain-Regelung.
- 250 ms Einregelphase, etwa 20 ms Detektorzeit, 40 ms Abregelung und 200 ms Erholung; unter -55 dBFS Detektorleistung keine neue Absenkung. Kein Lookahead und kein zusätzlicher Sample-Versatz in dieser Stufe.
- Ausschließlich Absenkungen, höchstens 1.5 dB pro Region bei voller Stärke. Stärke folgt der Mastering-Intensität und vorhandener Zurückhaltung bei dichtem Material. Die Profileingriffe und der Genre-EQ bleiben getrennte Stufen.
- Intensität 0 deaktiviert diesen Teil. Alte gespeicherte Parametersätze ohne neues Feld bleiben in der nativen Vorschau kompatibel und aktivieren ihn nicht nachträglich.
- Das echte AudioWorklet implementiert dieselben Detektoren und Filter wie Python. Die neue Stufe läuft vor De-Esser/Multiband, als Teil des bestehenden Korrektur-EQ-Schritts; kein zusätzlicher scheinbar immer aktiver Fortschrittsschritt.

## Limiter

- Gain-Berechnung jetzt bei voller Samplerate statt Minimum-Blöcken mit interpolierter Steuerspur. Auch das letzte unvollständige Millisekundenstück wird verarbeitet.
- Gemeinsame True-Peak-Hüllkurve für alle Kanäle, bestehendes 4x-Oversampling und blockweise Erfassung bleiben erhalten.
- 5 ms beidseitige Spitzenhaltung plus höchstens 5 ms vorauslaufende Gain-Rampe: insgesamt höchstens 10 ms zukünftiger Signalkontext in dieser offline berechneten Gain-Stufe. Die Audiolänge und Samplepositionen ändern sich nicht.
- Programmabhängige Erholung im Bereich 35–160 ms, langsamere Erholung bei anhaltender Reduktion. Berechneter Gain überschreitet an keiner Sampleposition den benötigten Gain der Peak-Hold-Hüllkurve.
- Hartes Sample-Clipping als regulärer Sicherheitsabschluss entfernt. Stattdessen weiterhin True Peak erneut messen und bei Bedarf das gesamte Ergebnis geringfügig absenken. Nachgelagerte Prüfung des tatsächlich exportierten Codecs bleibt unverändert aktiv.
- Der vorhandene maximale Gain-Reduction-Guardrail bleibt bestehen; ein zu aggressives LUFS-Ziel darf weiterhin verfehlt werden, statt zusätzliche Dynamik zu erzwingen.
- Die erste getestete Variante ohne ausreichende Spitzenhaltung war bei einem Bass-Dauerton schlechter und wurde verworfen. Die finale Variante behält die nötige Spitzenhaltung und bestand den Vergleich im gesamten geprüften Frequenzraster.
- Der native Vorschau-Limiter bleibt eine latenzarme Näherung. Nur der Kontrollrender und endgültige Export benutzen die vollständige Server-Limiter-Routine. Keine Behauptung einer sampleidentischen Gesamtvorschau.

## Prüfungen

- Produktionsbuild mit Next.js 16.4.3 einschließlich TypeScript und 128 statischen Seiten erfolgreich.
- Alle Node-Regressionsgruppen, 125 Python-Tests und DSP-Selbsttest (WAV24, True Peak, MP3, AAC, Sprachbereinigung) erfolgreich.
- Sechs neue Dynamic-EQ-Tests: Bypass/Stille/Originalinvarianz, kurzzeitige Überbetonungen vs. Dauerton, Stereo-Polarität, begrenzte Cut-Only-Filterantworten und echte Worklet-Parität bei 8/48 kHz über 128-Sample-Blockgrenzen.
- Sieben neue Limiter-Tests: einzelne Samples/Dateiende, begrenzte Vorregelung, adaptive Erholung, keine hart geclippten Plateaus, Stereolink, True-Peak-Sicherheit, Stille und reproduzierbarer Vergleich mit eingefrorenem bisherigem Algorithmus.
- Diagnostisches Frequenzraster 20/30/40/60/80/100/160/1000/8000 Hz: keine relevante Verschlechterung innerhalb der festgelegten numerischen Toleranz; weniger harmonische Gain-Modulation bei tiefen Tönen. Bei 40 Hz z.B. etwa 0.282 % → 0.0233 %, bei 80 Hz 0.000486 % → 0.000000976 %. Das ist kein Nachweis allgemeiner subjektiver Klangüberlegenheit.
- Echter Chrome-OfflineAudioContext lädt das ausgelieferte Worklet und rendert vier Sekunden synthetisches Stereo. Endlicher, tatsächlich veränderter Ausgang, erhaltenes Kanalverhältnis. Gemessene Offline-Renderzeit 185–350 ms auf diesem Rechner; das ist kein garantierter Live-Latenzwert.
- Isolierte lokale HTTP-Integration: signierte Analyse, gespeicherte Profile, Auto-Master, manuelle Neuerstellung, private WAV-Downloads, tatsächlicher Kontrollrender, ungültige Gewichtung und Null-Einfluss; vollständige DE/EN-Referenzoberfläche und A/B-Standard im Chrome-Browser erfolgreich.
- Je 20 Sekunden aus „On Tour“ und „Back to My Acid“ lokal gelesen, Originale nicht verändert. Jeweils Exporte mit/ohne neuen dynamischen EQ, vor und nach Limiter-Änderung. Finale Werte: On Tour rund -14.000 LUFS und -1.903 dBTP, Back to My Acid rund -14.002 LUFS und -1.000 dBTP.
- Auf den beiden kurzen Proben benötigte der aufgewärmte dynamische EQ etwa 0.17–0.30 Sekunden für 20 Sekunden Audio. Keine Server-Kapazitätsgarantie; die vorhandene Admission-/Speicherprüfung wurde nicht gelockert.
- Kein subjektiver Blind-Hörtest. Ein persönlicher Hörvergleich vor Deployment bleibt empfohlen. Keine echten Mails und keine Produktionsdatenbank benutzt.

## Lokale Wiederholung

- Vollständig: vorhandenes FFmpeg über `FFMPEG_BINARY` setzen, dann `node scripts/run-audit-tests.cjs`.
- Isolierte Oberfläche/API: `node scripts/run-tools-qa.cjs`; Bereitschaft von `http://127.0.0.1:3013/api/health` abwarten. Danach mit `BEATZUCKER_ISOLATED_QA=1` und installiertem Playwright-Modul `node scripts/reference-mastering-http-qa.cjs` sowie `node scripts/dynamic-eq-browser-qa.cjs`.
- Lokaler Song-Probelauf: `python/dynamic_eq_quality_probe.py --label after-limiter --source <lokale-WAV>`. Artefakte ausschließlich im ignorierten `validation-output/dynamic-eq-1.5/`.

Nächste weitergehende Ideen wie semantische Songabschnittserkennung oder Album-Mastering wurden hier nicht implementiert.
