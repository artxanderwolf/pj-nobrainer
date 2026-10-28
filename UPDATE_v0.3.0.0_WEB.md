# Web-Schnellrelease v0.3.0.0

Basis: `migration/angular`, `5cd58b9cb422127de4089596826451c7f282e4b6` (v0.20.0).
Design: bereitgestelltes Planungsdokument vom 28.10.2026 und zuletzt bestätigte Chat-Übergabe. Später vorgemerkte Systeme sind ausgeschlossen.

## Spieländerungen

- Dungeons 2–5 mit ID-basierter Auswahl, festen Gegnerwerten und Lootpools. Trainingslager-HP-Multiplikator 4, danach 8/16/32/64; bisherige prozentuale Rüstung bleibt. Encounterwerte 0,001/0,002/0,004/0,008/0,016; keine Änderung der Suchschritt- oder Wellentaktung.
- Ein Lauf zählt ab 360 erfolgreichen Wellen einmal. Nach 20 qualifizierten Läufen sucht ein neuer Lauf ab erfolgreicher Welle 100 mit 5 % je erfolgreicher Welle nach dem nächsten Zugang. Fund bleibt erhalten; Freischaltung erst nach Claim.
- Permanente Schriftrolle im Header und Missionszugang auf der Übersicht. Missionsfenster, x/Ziel-Anzeigen, einmalige Claims und nacheinander laufende 2-Sekunden-Abschlussmeldungen. Verborgene Missionen zählen intern ohne sichtbaren Eintrag oder Meldung.
- Bestehende Waffenbedingungen (je zehn Vorgängerwaffen) in Missionen überführt; bisherige Zähler aus der Waffenbezeichnung entfernt. Bereits verfügbare Waffenformen bleiben bei Migration verfügbar.
- Heiler auf Gelehrtenbasis, bevorzugter Stab, kein Schaden und keine kritische Heilung. Heilziel: niedrigstes lebendes HP-%, dann höchste Bedrohung, dann frühester Teamslot. Keine Wiederbelebung; Max-HP-Cap und Aussetzen bei voller Gruppe. Gleiche Aktionstimer und globaler Cooldown wie andere Klassen. Mission Heilkunst zählt einen besiegten Heiler sofort, auch vor einem manuellen Abbruch.
- In Dungeon 4 haben normale Gegner 15 % Heileranteil, die übrigen 85 % behalten das Verhältnis 55/20/15/10. Je Gegnerplatz 1 % Bosschance; Boss ersetzt dessen normalen Gegner. Boss basiert auf Rekrut, mit 10× HP, 2× Schaden und Speed 0,8. Fünf gleichverteilte Ziehungen ohne Zurücklegen aus dem gesamten Dungeonpool.
- 68 neue Materialien, IDs 10–77, mit den exakten Namen, Farben und aktuellen Basiswerten des Dokuments. Jeder neue Gegner hat vier exklusive Materialien mit 50/30/15/5. Der Testkatalog enthält die unabhängig aus dem Originaldokument gelesenen Werte und dessen SHA-256.
- Trainingslager-Lederfetzen nur noch bei Jäger und Lehrling. Andere Trainingslager-Materialwerte bleiben erhalten.
- Hilfe und Materialindex mitgeführt; Index zeigt Quellen und ID-basierte Farben.

## Architektur und Persistenz

Neue Fachlogik liegt in Angular-Kernen und Services (`mission-core`, `healing-core`, Dungeondefinitionen, Missionsservice). Kein zweites Spielprojekt, keine neue Produktionsabhängigkeit. Die alte Startwaffen-Kombinationssuche delegiert jetzt auf die exakt gleiche Startwaffe über feste IDs. Damit führt Contentwachstum nicht zu einer exponentiellen Startberechnung. Alte Namens-Lootprojektionen bleiben auf ihren bisherigen Dungeon-1-Kompatibilitätsumfang begrenzt.

App-Version: die ausdrücklich geplante vierstellige `0.3.0.0`. Save-Version: **15**, getrennt von der App-Version. Missions- und Sessionzustand werden im bestehenden Save gespeichert. Bestehende Inventare, aktive moderne Dungeonläufe und bereits verfügbare Waffenformen bleiben erhalten. Historische qualifizierte Läufe lassen sich aus alten Saves nicht rekonstruieren; nur die bekannten erfolgreichen Wellen einer noch laufenden alten Session werden übernommen. Alte Saves v8–v14 bleiben importierbar. Vor einem Rückwechsel auf v0.20.0 den alten Export behalten: die alte Version kennt Save 15 nicht.

Android-spezifische Dateien, Gradle-Version, APKs, Updatekanal und Workflows bleiben unverändert. Gemeinsame Angular-Änderungen würden bei einem späteren Android-Build ebenfalls einfließen. `check:web` und Web-Builds führen die Web-Prüfungen aus; der historische kombinierte `check` enthält weiterhin Android-Prüfungen, darunter die auf Save 14 fixierte Android-Abnahme. Diese ist für diesen Web-Release nicht aktualisiert. Eine bestehende Android-CI auf einem PR kann deshalb fehlschlagen; das ist keine Android-Releasefreigabe.

## Verifikation

- `node scripts/check-web.mjs`: 70 Prüfungen erfolgreich, einschließlich neuer Release-Tests für 359/360 Wellen, einmalige Qualifikation, 19/20 Läufe, Suchgrenzen und Zufallsgrenzen, Fund/Claim, Reload, Migration und unsichtbare Fortschritte.
- Neue Tests prüfen Heilzielregeln, Selbstheilung, kein Revive/Krit, Cap, volle Gruppe, Spieler-/Gegner-Kampfpfade, unmittelbaren Heilerkill, IDs, dokumentierte Materialwerte/Farben/Quellen, Dropgrenzen und fünf verschiedene Bossdrops.
- TypeScript-Prüfung und Produktionsbuild erfolgreich. Initiales Bundle ca. 531 kB, ca. 112 kB geschätzter Transfer; Warnbudget 500 kB überschritten, Fehlergrenze 1 MB eingehalten.
- Neuer Playwright-Browsertest: Desktop 1280×900 und Mobil 390×844; Missionszugriffe, Queue-Dauer, Claim/Reload, alte Waffenfreischaltungen, Dungeonauswahl, Zugriff über Dungeonpopup, Heilerfreischaltung, 77 Indexzeilen sowie echter JSON-Export, ungültiger Import, gültiger Import und Rücknahme erfolgreich.
- Zwölf bestehende Browserregressionen erfolgreich: Dungeonmodal, Loot einsammeln, Fortsetzung über Browser-Neustart, Ausrüstungsbereinigung, Schmiedeauswahl, Marktmenge, Markt-Waffenbilder, Kader, Runtime-Start, gemeinsame Waffenbilder, Rekrutierungsmodal, Waffenbildpilot.
- Der alte Windows-`--dump-dom`-Test für Spielstandtransfer erreichte sein Zeitlimit. Derselbe Ablauf wurde im neuen interaktiven Playwright-Test erfolgreich geprüft; kein erfolgreicher Lauf des alten Harness wird behauptet.

## Verbleibende Risiken / manuelle Abnahme

**Progressionsbalance:** Bei 0,10 % Begegnungschance pro Sekunde und fünf Stunden maximaler Laufzeit entstehen im Trainingslager im Mittel höchstens etwa 18 Begegnungen, vor Kampfzeit. Die geforderten 360 erfolgreichen Wellen pro qualifiziertem Lauf sind damit praktisch nicht erreichbar. Werte sind wie beauftragt umgesetzt; vor einer Spielerfreigabe muss dieses Designverhältnis entschieden werden. Die Tests bestätigen die technische Schwellenlogik mit kontrollierten Zuständen, keine reale Erreichbarkeit.

Heiler verwenden vorläufig das vorhandene Gelehrtenbild. Reale Mobilgeräte und langfristige Balance/Offline-Simulation sind noch nicht abgenommen. Bitte mit Sicherung eines eigenen alten Web-Spielstands Laden, Ausrüstung, fortgesetzten Dungeon, Claim, Export/Import und Layout am echten Smartphone prüfen.

Keine Rezepte, neuen Rüstungen/Schilde, absolute Rüstung/Penetration, Prestige, Energieentfernung, S1–S6/Spezialboni, neue HP-Regeneration oder Lifesteal-Quellen implementiert. Keine Veröffentlichung oder Zusammenführung nach `migration/angular` in diesem Arbeitsschritt.
