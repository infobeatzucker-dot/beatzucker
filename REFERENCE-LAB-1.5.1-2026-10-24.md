# Reference Lab 1.5.1 — vorbereitet, noch nicht deployed

- Großer Referenzeinfluss-Drehregler und drei kleinere Klangregler im bestehenden Character-Stil: Metalloberfläche, Riffelung, Lichtbogen, Positionsmarkierung und Schatten.
- Gewichtung bleibt ein nativer, tastaturbedienbarer Range-Fader je Referenztrack; nur die Darstellung wurde geändert.
- Bereiche, Standards und 5-Prozentpunkte-Schritte bleiben erhalten: Einfluss/Glättung 0…100 %, Bass/Helligkeit −100…100 %, Standards 65/0/0/65.
- Pointer-Capture, Ziehen vertikal/horizontal, Pfeiltasten, Shift, Page/Home/End, Doppelklick und sichtbarer Reset. Prozentwerte, eindeutige ARIA-Beschriftungen, Fokusmarkierung, reduzierte Bewegung.
- Mobile: große Hauptbedienung, kleinere Regler als gut lesbare untereinander angeordnete Instrumente. Keine DSP-, API-, Datenbank- oder Lautheitsänderungen.
- Deutsch/Englisch und öffentliche Versionshistorie 1.5.1 synchron.

## Prüfungen

- `node scripts/reference-dial-tests.cjs`: tatsächliche Handler für Grenzen, Schritte, Tastatur, Drag, Abbruch, Reset und ARIA-Werte.
- `node scripts/reference-matching-tests.cjs`: Signaturen, Referenz-Bundles, Validierung und bestehende Audio-Anbindung.
- Produktionsbuild mit Next 16.4.3 einschließlich TypeScript erfolgreich.
- Isolierter HTTP/Chrome-Test: echte synthetische Auto-/manuelle WAV-Master, Kontrollvorschau, Referenzspeicherung, Null-Einfluss, Character-Endpunkte und Peak-Grenzen bestanden. Keine Produktionsdaten oder Mails.
- Chrome-Reglerprüfung: Tastatur, Ziehen, Reset, bipolare Grenzen, DE/EN, 320/390 px ohne horizontalen Überlauf, Reduced Motion. Screenshots unter `validation-output/reference-dials-1.5.1/`.
- Release-Audience- und Full-Release-Guidance-Tests bestanden.

Kein Commit, Push oder Server-Deploy durch diese Änderung autorisiert oder ausgeführt.
