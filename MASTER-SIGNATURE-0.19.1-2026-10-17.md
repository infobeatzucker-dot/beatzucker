# 0.19.1 – offene Master-Signatur

Interner Entwurfsstand, nicht als eigene Version veröffentlicht. Die Änderungen sind inzwischen im gemeinsamen vorbereiteten Release 0.20.0 enthalten.

Noch nicht deployed. Der innere Scrollbereich der linken Homepage-Spalte ist entfernt, nicht nur sein Balken versteckt: kein `overflow-y: auto`, keine Viewport-Höhenbegrenzung. Unter 850 px Bildschirmhöhe wird die Spalte nicht sticky, sodass der Inhalt vollständig mit der Seite erreichbar bleibt.

Die bisherige gerahmte Übersicht wird durch eine offene Klangskulptur mit Lichthof, feinen Orbitalen, großer MASTERED-Typografie und kompakten echten Messwerten ersetzt. Die bestehende Canvas-Steuerung begrenzt die Animation und pausiert sie bei unsichtbarem Tab; reduzierte Bewegung ergibt ein Standbild. Die Grafik ist kein Analyzer und kein Qualitätsnachweis. Keine neuen Audio-, Netzwerk- oder DSP-Zugriffe.

Final-EQ-Erklärung anhand des vorhandenen Codes: `final_air_gain` ist standardmäßig 0 dB. Die Automatik setzt zunächst 0,4 dB, wenn `rms_air - rms_high < -16` und der spektrale Schwerpunkt unter 4500 Hz liegt; Zurückhaltung und Intensität können das anschließend reduzieren. Die Ausgabe überspringt diesen zusätzlichen High-Shelf, wenn die Verarbeitung inaktiv ist oder der Betrag höchstens 0,001 dB ist. `air_gain` des früheren Korrektur-EQs ist davon unabhängig. Der konkrete letzte Auftrag wurde nicht aus der Produktionsdatenbank ausgelesen. Kein Parameter und keine Audiobearbeitung wurden geändert. Ein zusätzlicher Test sichert die Unabhängigkeit beider EQs ab.
