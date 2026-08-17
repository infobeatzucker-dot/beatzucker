# Beatzucker – Verbesserungs-Roadmap

Stand: 2026-08-13. Sammlung von Ideen aus der Session, priorisiert. Nichts hiervon ist umgesetzt — dient als Grundlage für morgen.

## 🔴 Priorität 1 — Zuverlässigkeit (sollten wir zuerst angehen)

1. **DB-Backup-Cron reparieren.** `backup.sh`/`backup-db.sh` auf dem Server prüfen aktuell nicht, ob der `cp`-Befehl erfolgreich war — wenn `production.db` fehlt (wie es uns diese Woche passiert ist), läuft der Cron einfach leer durch, ohne Fehler zu melden. Fix: Existenz-Check + Alert (E-Mail an ADMIN_EMAIL) bei Fehlschlag.
2. **DB aus dem Cleanup-Pfad verlegen.** Auch mit dem `.db`-Ausschluss im Cleanup-Cron ist `production.db` weiterhin im selben Verzeichnis wie die Upload-Dateien (`/app/uploads`). Sauberer: eigenes Volume/Verzeichnis `/app/data` nur für die DB, komplett getrennt vom Cleanup-Scope — schließt die ganze Fehlerklasse aus, statt sie nur zu filtern.
3. **Klartext-Passwort rotieren.** In `health_check.py` (außerhalb des Repos, lokal) liegt ein Server-Passwort im Klartext. Sollte rotiert und durch SSH-Key-Auth ersetzt werden (Key existiert ja schon: `rebeatz_deploy`).
4. **Automatisierter Post-Deploy-Smoketest.** Kleines Skript, das nach jedem Deploy automatisch prüft: Homepage 200, `/api/account` 401 ohne Session, Python-Service `/health`, und optional einen echten Mini-Mastering-Durchlauf. Reduziert manuelles Nachschauen.
5. **Deploy-Skript statt manueller SSH-Befehlskette.** Ein `deploy.sh` auf dem Server (git pull, Image bauen, alten Container als Rollback taggen, neuen starten, Healthcheck) macht Deploys reproduzierbar und weniger fehleranfällig.

## 🟠 Priorität 2 — Mastering-Qualität

6. **Noise-Shaped Dithering.** Aktuell reines TPDF-Dither bei 16-bit-Export. Noise-Shaping (z.B. simple POW-r-artige Kurve) verschiebt das Quantisierungsrauschen in weniger hörbare Frequenzbereiche — hörbar sauberer bei leisen Passagen.
7. **Loudness Range (LRA) als zusätzliches Ziel.** Aktuell wird nur Integrated LUFS + True Peak gesteuert. Ein LRA-Zielkorridor (z. B. genre-abhängig) würde verhindern, dass sehr dynamische Tracks beim Limiting unnötig "flachgebügelt" werden.
8. **De-Esser / Vocal-Erkennung.** Für vocal-lastige Genres (Pop, HipHop, R&B) könnte ein einfacher Sibilanz-Detektor + gezielte Kompression im 5–8kHz-Bereich Zischlaute reduzieren, ohne die generelle Presence-EQ zu beeinträchtigen.
9. **Performance des True-Peak-Limiters.** 4×-Oversampling über den kompletten Track ist bei langen Files (Podcasts, DJ-Sets) speicher-/zeitintensiv. Könnte blockweise statt am Stück verarbeitet werden, um RAM-Spitzen zu vermeiden.

## 🟡 Priorität 3 — Produkt-Features

10. **Batch-Mastering.** Mehrere Dateien gleichzeitig hochladen und nacheinander automatisch mastern lassen (Queue) — wurde in einem Ressourcen-Artikel bereits als Feature erwähnt, existiert aber noch nicht.
11. **Preset-Favoriten / zuletzt genutzte Einstellungen.** Wiederkehrende Nutzer starten oft mit denselben Plattform/Preset/Intensity-Kombinationen — Speichern der letzten Wahl (LocalStorage reicht) spart Klicks.
12. **Teilbarer Vorschau-Link.** Kurzer, zeitlich begrenzter Link zu einem gemasterten Track, um Feedback von Bandkollegen/Kunden einzuholen, ohne dass diese sich registrieren müssen.
13. **Referenz-Track-Bibliothek sichtbarer machen.** Ist schon gebaut (100 Slots pro Account), aber auf der Startseite kaum beworben — evtl. kurz im Feature-Bereich hervorheben, jetzt wo es für alle kostenlos ist.

## 🟢 Priorität 4 — Wachstum & Sichtbarkeit

14. **Share-Badge für Social Media.** Optionaler "Gemastered mit Beatzucker"-Sticker/Wasserzeichen-Vorschlag beim Teilen auf Social Media — organische Reichweite, da jetzt kostenlos positioniert.
15. **Testimonials/Bewertungen einholen.** Falls es zufriedene Nutzer gibt, `aggregateRating` im JSON-LD (`app/layout.tsx`) ergänzen — verbessert die Google-Rich-Result-Darstellung.
16. **Newsletter/Update-Opt-in.** Kurzer, DSGVO-konformer Hinweis für Feature-Updates — aktuell keine Möglichkeit, wiederkehrende Nutzer über neue Presets/Formate zu informieren.

## 🔵 Priorität 5 — Politur & Sicherheit

17. **Barrierefreiheit-Check.** ARIA-Labels, Tastaturnavigation, Kontraste — noch nicht systematisch geprüft.
18. **Upload-Validierung härten.** Aktuell vermutlich Dateiendungs-basiert — Magic-Byte-Check ergänzen, damit keine falsch benannten Dateien durchrutschen.
19. **Admin-Zugang zusätzlich absichern.** Aktuell nur E-Mail-Match (`ADMIN_EMAIL`) + normales Passwort. 2FA für den Admin-Account verpflichtend machen, unabhängig vom Nutzer-Toggle.
20. **Dependabot/automatisierte Dependency-Updates** für `package.json` und `requirements.txt` einrichten.

---

**Vorschlag für morgen:** Mit Priorität 1 (Punkte 1–2, sind schnell und schließen die gerade erlebte Fehlerklasse endgültig) starten, danach je nach Zeit 1–2 Punkte aus Priorität 2 oder 3 auswählen.
