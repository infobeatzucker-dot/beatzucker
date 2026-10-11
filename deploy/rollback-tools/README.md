# Datenbewahrender Rückkehrstart

Der alte Container darf beim Rollback kein `prisma db push` ausführen: Dadurch
würden neue Datenbankfelder entfernt. Beispielsweise enthalten die zusätzlichen
Zustimmungsfelder ab 0.10.0 Daten, die auch bei Rückkehr zu 0.9.1 erhalten bleiben
müssen. `--accept-data-loss` ist hier ausdrücklich keine Lösung.

`deploy.sh` bindet diesen Ordner schreibgeschützt in das bisherige Image ein.
`start.sh` prüft mit dessen eigenem Prisma-Client jede vorhandene alte Tabelle und
alle vom alten Client ausgewählten Felder. Zusätzliche Pflichtspalten ohne
SQL-Standardwert werden abgelehnt, weil der alte Client sie beim Anlegen eines
Datensatzes nicht befüllen würde. Bei erfolgreicher Prüfung startet Supervisor
direkt, ohne Schema-Abgleich oder Wiederherstellung einer alten Datenkopie.

Diese Prüfung deckt nicht beliebige inkompatible Datenmigrationen, geänderte
Fremdschlüssel, Typbedeutungen oder geänderte Geschäftsregeln ab. Migrationen
müssen weiterhin rückwärtskompatibel geplant werden. Für 0.10.0 sind die neuen
Zustimmungsfelder optional; Bestandsfelder bleiben unverändert. Ein praktischer
Start- und Schreibtest mit altem Image und neuen Testdaten bleibt erforderlich.

Bei fehlgeschlagener Prüfung bleibt der Start gestoppt; keine automatische
Löschung neuer Daten, kein stiller Rückgriff auf einen älteren Datenstand.
