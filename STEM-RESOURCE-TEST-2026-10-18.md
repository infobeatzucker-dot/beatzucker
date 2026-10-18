# Stem-Ressourcentest – 18. Oktober 2026

## Ergebnis

Echte lokale CPU-Separation ist machbar. Für den bestehenden Server mit zuletzt rund 4 GB RAM ist ein unbeschränkt parallel zum Mastering laufender Stem-Dienst nicht empfehlenswert. Kein Produktionsdienst wurde installiert, kein Server belastet, kein Audio zu einem Trennanbieter hochgeladen. Das Tool ist noch nicht implementiert oder freigeschaltet.

## Gemessene Läufe

| Lauf | Audio | Reine Trennung | Gesamtlauf einschließlich Python-Start | Peak Arbeitsspeicher (RSS, kompletter Prozessbaum) | Peak privater Commit | Dateien |
|---|---|---|---|---|---|---|
| Pop-Vorschau: On Tour | 20 s | 35,48 s | 40,97 s | 1.239 MiB | 1.470 MiB | 33,6 MiB |
| Ganzer Clubtrack: Back to My Acid | 187,20 s | 366,75 s | 374,34 s | 1.940 MiB | 2.163 MiB | ca. 315 MiB |

Export umfasst vier Einzelstems plus eine zusätzliche Instrumental-Summe, als 32-Bit-Float-WAV ohne getrennte Pegelnormalisierung. Die späteren Produktformate sind damit noch nicht festgelegt. Alle Ausgaben waren endlich und wurden tatsächlich geschrieben. Beim Clubtrack lag der größte Einzelstem-Peak unter 1.0. Rückmischfehler und Peaks liegen in den Rohberichten; sie sind keine Klangbewertung. Keine manuelle Hörprüfung oder Vergleichsqualität gegen eMastered behauptet.

Die Inferenz lief mit zwei Torch-Threads und einer auf zwei logische CPUs beschränkten Worker-Affinität. Gemessene kumulierte CPU-Zeit: 71,11 s für die Vorschau und 599,02 s für den vollständigen Song. Ein Durchlauf wurde nach dem anderen ausgeführt. Das ist ein lokaler Praxisvergleich, kein hardwareunabhängiger Leistungswert. Die Maschine war kein exklusiver Linux-Benchmarkhost; normale Desktopprozesse und leichte Entwicklungsprüfungen waren nicht systemweit deaktiviert.

## Umgebung und Grenzen

- Windows 10, Intel Family 6 Model 142, vier logische CPUs, 15,85 GiB physischer RAM. Keine GPU verwendet.
- Eigene Umgebung: `validation-output/stem-benchmark-20261018/venv`; keine Änderung an `python/requirements.txt`, dem Mastering-Venv oder den Produktions-Images.
- Python 3.12.14, Demucs 4.1.0, Torch 2.10.0+cpu, NumPy 2.5.4, psutil 7.2.2, SoundFile 0.13.1, Safetensors 0.8.0.
- Modell `hf://htdemucs`, nur offizieller Namespace adefossez, explizit kein automatischer Legacy-Pickle-Fallback. Safetensors-Checkpoint `955717e8`.
- Hugging Face Revision: `cbc8a9b1a87023b7fd74e7b3412e6321c0eab003`.
- SHA-256: `d9fa14133cfcc034a6758923bb3a8ca9f8dfd0b582134643bbf83f72c17576dd`.
- Segment 7,8 s, Overlap 0,25, ein Shift, keine parallelen Segmentjobs. Ergebnisse sind wegen des Shift-Verfahrens nicht bitidentisch garantiert.
- Modell bereits lokal gecacht bei den beiden verwerteten Messläufen. Downloadzeit ist nicht Bestandteil der reinen Trennzeit. Modell-Laden dauerte danach etwa 1,3–1,4 s.
- Sampling des vollständigen Prozessbaums alle 50 ms; Abbruch bei mehr als 2.560 MiB RSS oder 30 Minuten. Dies ist ein Watchdog, kein Betriebssystem-Hardlimit und keine Linux-cgroup-Messung. Spitzen zwischen Samples sind möglich. RSS und privater Commit sind unter Windows unterschiedliche Größen; nicht einfach auf Linux übertragen.
- Der erste Vorlauf `preview-pop` erfasste versehentlich nur den kleinen Windows-Venv-Starter. Seine ~3-MiB-/CPU-Werte sind ungültig und wurden nicht für die Tabelle verwendet. Die Wiederholung `preview-pop-tree` und der vollständige Lauf erfassen nachweislich zwei Prozesse.

## Konsequenzen für das geplante Angebot

1. Vocal Remover und Vier-Stem-Ansicht können denselben Modelllauf nutzen. Zwei herunterladbare Dateien bedeuten bei dieser Engine nicht halbierte Rechenlast.
2. Ohne Freischaltung nur kurzen Ausschnitt verarbeiten/ausliefern, eigenes Testbudget und höchstens ein schwerer Job gleichzeitig. Vollständige Stems und direkte Download-URLs serverseitig sperren. Abhörbares Preview-Audio lässt sich mitschneiden; kein absoluter Kopierschutz.
3. Bevorzugt getrennter Worker, als Ausgangspunkt etwa 8 GB RAM und 2–4 vCPU; tatsächliche Zielhardware erneut messen. GPU-Betrieb wäre ein gesonderter Kosten-/Leistungstest, hier nicht geprüft oder gebucht.
4. Falls derselbe 4-GB-Server verwendet werden soll: erst isolierten Linux-Container-Test mit echtem CPU-/RAM-Limit und gleichzeitiger Mastering-Last durchführen. Gemeinsame Warteschlange oder reservierte Ressourcen nötig. Kein Einbau in den laufenden Mastering-Prozess und kein automatischer Produktivversuch.
5. Temporäre Ausgabe kann je Song mehrere hundert MiB erreichen. Auslaufzeit, Gesamtspeicherbudget, Größen-/Dauerlimit und Aufräumen müssen vor Freigabe feststehen. ZIP- oder MP3-Speicherersparnis hier nicht gemessen.
6. Code-Lizenz, Modellgewichte/Trainingsdaten, Datenschutz und Hinweise zu Musikrechten vor öffentlicher Bereitstellung gesondert prüfen. Das Code-Repository nennt MIT; das allein ist keine vollständige rechtliche Prüfung des geplanten Produkts.

## Reproduzierbarkeit / Artefakte

Script: `scripts/stem-resource-probe.py`. Inputs sind nur gelesene, vom Betreiber zum Testen genannte WAVs. Modelle wurden heruntergeladen; Audiodateien wurden nicht hochgeladen. Rohberichte, Worker-Logs und echte Ausgaben:

- `validation-output/stem-benchmark-20261018/preview-pop-tree/report.json`
- `validation-output/stem-benchmark-20261018/full-club-tree/report.json`
- jeweils `worker.log`, `vocals.wav`, `drums.wav`, `bass.wav`, `other.wav`, `instrumental.wav`.

Diese Dateien und die Testumgebung sind Git-ignoriert und gehen nicht in den normalen Quellcode-Deploy. Noch keine produktive Admin-Freischaltung, Queue oder Stem-API vorhanden.

## Primärquellen

- https://github.com/adefossez/demucs
- https://pypi.org/project/demucs/4.1.0/
- https://huggingface.co/adefossez/HTDemucs
- https://raw.githubusercontent.com/adefossez/demucs/main/demucs/api.py

Die lokale Messung, nicht die Laufzeitschätzung in einer Produktbeschreibung, ist Grundlage der Zahlen oben.
