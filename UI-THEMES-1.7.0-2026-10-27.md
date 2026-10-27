# Farbwelten 1.7.0 – Vorbereitung, noch nicht deployed

## Umsetzung

- Fünf Designs: Original, Studio Light, Analog, Aurora und Sandstone.
- Auswahl in der oberen Navigation, mobil im Menü und im Dashboard.
- Profil mit fünf Vorschaukacheln und ausdrücklichem Speichern im Benutzerkonto.
- Ohne Kontospeicherung bleibt die Auswahl eine Browser-Einstellung. Eine gespeicherte Kontoeinstellung wird beim nächsten Login auch auf anderen Geräten geladen.
- Oberflächen, Schriften, 3D-Regler, Fader und Canvas-Audioanzeigen verwenden abgestimmte Farben. Keine Farbfilter auf Bildern oder der gesamten Seite.
- Ein Designwechsel lädt keine Audio-Engine neu. DSP, Zielwerte und Mastering-Parameter wurden nicht geändert.
- Original bleibt Standard. Ungültige gespeicherte Werte fallen auf Original zurück; blockierter Browserspeicher verhindert die Bedienung nicht.
- Deutsche und englische Bedienung, Datenschutztexte und öffentliche Versionshistorie ergänzt.

## Speicherung und Sicherheit

- Browser-Schlüssel: `beatzucker_ui_theme` (kein Tracking).
- Neues optionales Feld `User.uiTheme`; additive Schemaänderung, keine Bestandsdaten werden ersetzt.
- `GET/PATCH /api/account/theme`: Anmeldung und aktuelle Sitzung erforderlich; nur das eigene Konto, feste Liste mit fünf Werten, keine weiteren Änderungsfelder.
- Änderungsanfragen verwenden den vorhandenen Origin-, Größen- und Rate-Limit-Schutz.
- Kontodatenexport enthält die gespeicherte Auswahl; Kontolöschung entfernt sie mit dem Nutzer.
- Späte Ladeantworten überschreiben keine inzwischen bewusst gewählte Vorschau.

## Prüfung (isoliert, keine Produktionsdaten und kein Mailversand)

- Vollständige Regression: Node-Prüfungen, 131 Python-Tests sowie DSP-Selbsttest erfolgreich.
- Design-Tests: fünf Paletten, Lesbarkeit der Grundfarben, Originalfarben, gültige Canvas-Farben, vollständige Farbvariablen, Bootstrap und blockierter Speicher erfolgreich.
- Chrome: fünf echte Designs und Regler, Neuladen, mobile Navigation bei 320/390 px, Profil auf Deutsch/Englisch, Kontospeicherung und Wiederherstellung in zweitem Browser erfolgreich.
- Echte API-Prüfung: Gastzugriff abgelehnt, unbekannte Werte/Zusatzfelder und fremde Herkunft abgelehnt, eigener Export und Lade-/Auswahlkonflikt geprüft.
- Chrome im hellen Design: echter Upload, Analyse, Auto-Master, A/B-Umschaltung, audio-reaktive Grafik mit Pause, WAV-Download und Übergabe zur manuellen Feinabstimmung erfolgreich.
- Screenshots: `validation-output/ui-theme-1.7/` und `validation-output/express-assistant-1.6/light/`.
- Abschließender Produktionsbuild mit Next.js 16.4.3, TypeScript und 131 Seiten erfolgreich.

## Veröffentlichung

Noch nicht committed, gepusht oder deployed. Standarddeploy muss das neue optionale Datenbankfeld bereitstellen. Danach Navigation, Profil-Speicherung, erneuten Login und DE/EN-Versionsseiten live prüfen.
