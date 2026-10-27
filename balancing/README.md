# NoBrainer Data Architecture v1

Die kanonischen Balance- und Contentdaten liegen in `balancing/tables/*.csv`. Die CSV-Dateien sind Excel-kompatibel und Git-freundlich: Sie können in Excel bearbeitet werden, benötigen aber keine Excel-Bibliothek in Web- oder Android-Builds.

## Datenfluss

`balancing/tables/*.csv` → Validierung → generierte TypeScript-Daten → Game-Cores → Angular/Legacy-Kompatibilität.

`npm start` und der Build-/Check-Ablauf führen `scripts/prepare-legacy-runtime.mjs` aus. Dabei werden die Tabellen validiert und `src/app/game/data/generated/*.generated.ts` neu erzeugt. Ungültige Referenzen, doppelte IDs oder Werte außerhalb unterstützter Bereiche stoppen den Vorgang.

Manuell kann die Erzeugung mit `node scripts/data/build-game-data.mjs` gestartet werden; eine reine Prüfung ist mit `node scripts/data/validate-game-data.mjs` möglich.

## IDs und Namen

Bestehende stabile IDs bleiben erhalten: Material-IDs `1..9`, Klassen-IDs wie `fighter`, Waffenform-IDs wie `sword` und Dungeon-ID `1`. Materialien besitzen zusätzlich einen stabilen `technical_key`. Sichtbare Namen sind Präsentationsdaten und keine technische Identität.

Dungeon-ID `1` trägt seit v0.15.1 den Anzeigenamen `Trainingslager` über `dungeons.csv`. Eine Änderung dieses Anzeigenamens verändert weder die technische Dungeon-Identität noch Save- oder Balancing-Referenzen.

Seit v0.13.14 arbeitet die aktive Material-Fachlogik ID-nativ: Lager und Dungeon-Loot sind ID-keyed, Dungeon-Drops referenzieren `materialId`, Schmiede und Markt lösen Materialien über `materialId` auf, und Waffenberechnungen lesen Materialdefinitionen direkt über IDs. Materialnamen werden nur an Präsentations- und Altstand-Kompatibilitätsgrenzen aufgelöst.

Alte Saves mit Namensreferenzen bleiben ladbar. Beim Laden werden bekannte Materialnamen auf die bestehenden stabilen IDs migriert und der normalisierte Zustand wieder gespeichert. IDs werden niemals wegen einer Umbenennung des sichtbaren Namens neu vergeben.

## Persistenz

Kanonische Materialbestände verwenden `String(materialId)` als JSON-Schlüssel und tragen die `materialId` zusätzlich im Eintrag. Waffenslots und Schmiede-/Marktreferenzen besitzen `materialId` als technische Referenz. Sichtbare Namen dürfen als Anzeige-Snapshot vorkommen, sind aber nicht maßgeblich für Identität, Berechnung oder Zuordnung.

Trainingslager-Sitzungsdaten wie aktiver Kampf, Gegner, Countdown und Live-Protokoll bleiben bewusst transient und werden nicht als neue Save-Struktur eingeführt. Innerhalb der laufenden App läuft eine gestartete Sitzung auch bei geschlossenem Popup weiter; ein App-Neustart verwirft einen geladenen aktiven Alt-Lauf weiterhin. Die persistierte `dungeonTeamSlots`-Auswahl bleibt dagegen bestehen und kann beim nächsten Öffnen wiederverwendet werden.

## Balancequelle

Die Werte aus v0.13.10 wurden ursprünglich 1:1 in Tabellen übertragen. Die v0.13.10-Baseline-Dateien dienen weiterhin als eingefrorene Logik-/Kompatibilitätsschicht, sind aber keine zweite Balancequelle. Balanceänderungen gehören ausschließlich in `balancing/tables/`; generierte Dateien werden nicht manuell bearbeitet.

Seit v0.15.2 sind die `base_cost_nickel`-Werte aller fünf Ausbauarten in `upgrades.csv` halbiert. Die Wachstumsfaktoren bleiben unverändert; dadurch halbiert sich jede Preisstufe eines Ausbaus, während Rekrutierungskosten unverändert bleiben.

Seit v0.15.3 enthält `character_progression.csv` die stat-spezifischen Level-Faktoren. Der bisherige Standardfaktor `1,10` bleibt für HP, E, R, AW, K-C, HP-R, E-R, LR und DS bestehen. SF, P/PRÄ und K-S skalieren mit `1,01` pro Level, ERF mit `1,00` und damit gar nicht mehr durch Level. Bedrohung bleibt wie zuvor vollständig levelunabhängig; die XP-Anforderung skaliert unverändert mit `1,40`.

Dungeon-spezifische Laufzeit-, Anzeigenamen- und Kostenwerte gehören ebenfalls in `balancing/tables/dungeons.csv`. Dungeon-ID 1 besitzt `display_name = Trainingslager`, `duration_ms = 18000000` für fünf Stunden und `energy_cost = 0`, weil Energie im Dungeon vorerst weder verbraucht noch als Start-/Abbruchbedingung verwendet wird.

Die vollständige Entfernung der verbleibenden Legacy-Runtime ist ein eigener Angular-Cutover und unabhängig von der ID-Architektur. Sie soll nicht mit Balanceänderungen vermischt werden.

## Waffenfreigaben und Trägerfaktoren v0.20.0

`class_equipment_rules.csv` ist die kanonische Quelle für erlaubte Waffenform-IDs,
Zweiwaffen-/Schildfreigaben und Präferenzen pro stabiler Klassen-ID. Der Generator
schreibt `equipment-rules.generated.ts`. Schildfreigaben sind Metadaten, kein neues
Schildsystem. Keine anderen Werte der älteren Charakter-Abhängigkeitstabelle wurden übernommen.

Die gemeinsame Ausrüstungsprüfung entscheidet vor einer Mutation über das vollständige
Ziel-Loadout und bereinigt vorhandene Belegungen beim Laden/Import. Lagergegenstände
werden dabei weder gelöscht noch kopiert. Der bekannte Startgegenstand wird an seiner
technischen Legacy-Grenze ausdrücklich als `sword` projiziert; unbekannte Formen werden
nicht durch einen Schwert-Fallback freigegeben.

Trägerfaktor: Rekrut mit zwei 1H-Waffen ×0,75; bevorzugter Aufbau zusätzlich ×1,10.
Kampf, Charakter-ROH und Ausrüstungsvorschau verwenden dieselbe Funktion. Gegenstands-
und Wirtschaftswerte erhalten keinen Trägerfaktor. Das Save-Format bleibt Version 14;
die idempotente Belegungsprüfung benötigt kein neues persistiertes Datenformat.

Dungeon 1: `encounter_chance=0.05`, `search_step_ms=1000`; Gegnerwerte und Suchheilung
bleiben erhalten. Der neue Quellenstand wurde für den Freigabekandidaten vorbereitet;
der öffentliche Android-Stable-Kanal bleibt bis zur Releasefreigabe auf der bisherigen APK.
