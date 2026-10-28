# Web v0.4.0.0 – eigene Dungeonfenster und parallele Läufe

Grundlage: veröffentlichte Web-Version 0.3.0.1, `migration/angular` bei `d0bcc4eb55d8bf216053deda95f47865ef468ed5`. Entwicklungsregeln und aktuelle betroffene Repository-Dateien vor Änderungen geprüft.

## Verhalten

- Fünf getrennte Dungeon-Kacheln ersetzen das Auswahlmenü. Jede öffnet das zugehörige Lauf-Fenster mit Team, Countdown, Gegnern, Beute und Protokoll. Gesperrte Dungeons bleiben sichtbar und werden erst nach dem Missions-Claim geöffnet.
- Alle freigeschalteten Dungeons können parallel mit unterschiedlichen Teams laufen. Schließen oder Wechseln eines Fensters beendet keinen Lauf.
- Ein Charakter kann nur einem aktiven Dungeon angehören. Teamauswahl und Start prüfen unabhängig voneinander die aktuelle Belegung. Gefallene Teilnehmer bleiben bis zum Laufende reserviert. Abbruch oder Zeitablauf gibt ausschließlich das betreffende Team frei.
- Team, Laufzeit, Suche, Kampfaktionen, Beute, Protokoll und Qualifikationsfortschritt sind je Dungeon unabhängig. Ausrüstungswechsel aktualisieren alle laufenden Kämpfe. Offline-Fortsetzung und Übersicht berücksichtigen alle Dungeons.
- Abgeschlossene und eingesammelte Missionen verschwinden aus der Liste. Freischaltungen und Claim-Status bleiben gespeichert; noch nicht eingesammelte Missionen bleiben sichtbar. Ohne offene Missionen erscheint ein Leerhinweis. Das Quest-Icon bleibt immer erreichbar.
- Weiterhin 5 % unabhängige Fundchance je Suchsekunde in jedem Dungeon. Kein fester 20-Sekunden-Takt; Kampf- und Lootregeln bleiben Teil des bestehenden Ablaufs.

## Architektur / Speicherstände

Die gemeinsame Dungeon-Engine erhält explizite Kontexte für den jeweiligen Dungeon. Es gibt weiterhin einen zentralen Spieltick; keine fünf kopierten Engines, keine Auswahlumschaltung während Hintergrundupdates und keine zusätzlichen Produktionsabhängigkeiten.

Kanonischer Speicherort ist `state.dungeons[dungeonId]`. Frühere globale Lauf-Felder und der einzelne Missions-Lauffortschritt werden ausschließlich an der Lade-/Reset-Grenze migriert und anschließend entfernt. Ein bestehender v15-Lauf wird mit seiner Dungeon-ID, absoluter Endzeit, Charaktergruppe, Kampf-/Suchzustand, gesammelter und ausstehender Beute sowie Qualifikationsfortschritt übernommen. Historische unbekannte Laufverteilungen werden nicht erfunden. Die Migration ist wiederholbar ohne doppelte Fortschrittszählung.

Bei widersprüchlichen importierten parallelen Charakterbelegungen behält der Dungeon mit der niedrigeren ID den Teilnehmer. Nur der spätere kollidierende Lauf wird angehalten; gesammelte und bereits verdiente ausstehende ID-Beute bleiben erhalten. Charaktere werden dabei nicht geheilt oder gelöscht.

App-Version **0.4.0.0** wegen des größeren UI-/Speicherumbaus; Save-Version **16** wegen des tatsächlich geänderten Datenformats. Ältere unterstützte Saves bleiben importierbar. Für einen Rückwechsel den Export aus der alten Version behalten. Hilfe/Index wurden mitgeführt. Android-spezifische Dateien, APK-Versionen und Updatekanal sind unverändert.

## Verifikation

- 71 Web-Prüfungen einschließlich neuer Domain-Tests für fünf parallele Läufe, doppelte Belegung, gefallene Teilnehmer, Startschutz trotz manipulierter Auswahl, Abbruch/Timeout nur eines Laufs, unabhängige Qualifikation, Save/Reload, v15-Migration, getrennte Beute und Ausrüstungs-Timer.
- TypeScript und Produktionsbuild erfolgreich. Bundle ca. 539 kB: bestehendes Warnbudget 500 kB überschritten, Fehlerbudget 1 MB eingehalten.
- Neuer Desktop-/Mobil-Browsertest: fünf Karten und parallele Läufe, reservierte Charaktere fehlen in fremden Team-Pickern, genaue Übernahme der alten Deadline und HP, Neustart aller Läufe, getrennte Protokolle/Beute, erneut nutzbare Charaktere nach Abbruch, ausgeblendete Claims nach Reload sowie dauerhaftes Quest-Icon bei leerer Missionsliste.
- Bestehender Schnellrelease-Browsertest einschließlich JSON-Export, ungültigem Import, gültigem Import und Rücknahme erfolgreich. Zwölf weitere bestehende Browserregressionen erfolgreich; ihre Save-/Dungeon-Felder wurden auf das neue kanonische Format umgestellt. Explizite Altstand-Fixtures bleiben Altstände.

## Praktische Abnahme

Mit gesichertem eigenem Web-Spielstand zwei unterschiedliche Teams in zwei freigeschalteten Dungeons starten, Fenster wechseln/schließen und die Seite neu laden. Einen Lauf abbrechen: Der andere muss weiterlaufen, dessen Teilnehmer müssen gesperrt bleiben; das beendete Team muss wieder auswählbar sein. Getrennte Beute einsammeln. Eine Mission einsammeln und erneut laden: Eintrag bleibt verborgen, Freischaltung erhalten. Mobile Darstellung am echten Gerät und längere Offline-Zeiträume bleiben praktisch abzunehmen.

Dieser Stand wird als prüfbarer PR vorbereitet. Eine Web-Veröffentlichung oder Android-Freigabe ist damit nicht automatisch verbunden.
