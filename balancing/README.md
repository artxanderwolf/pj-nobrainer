# NoBrainer Data Architecture v1

Die kanonischen Balance- und Contentdaten liegen in `balancing/tables/*.csv`. Die CSV-Dateien sind Excel-kompatibel und Git-freundlich: Sie können in Excel bearbeitet werden, benötigen aber keine Excel-Bibliothek in Web- oder Android-Builds.

## Datenfluss

`balancing/tables/*.csv` → Validierung → generierte TypeScript-Daten → Game-Cores → Angular/Legacy-Kompatibilität.

`npm start` und der Build-/Check-Ablauf führen `scripts/prepare-legacy-runtime.mjs` aus. Dabei werden die Tabellen validiert und `src/app/game/data/generated/*.generated.ts` neu erzeugt. Ungültige Referenzen, doppelte IDs oder Werte außerhalb unterstützter Bereiche stoppen den Vorgang.

Manuell kann die Erzeugung mit `node scripts/data/build-game-data.mjs` gestartet werden; eine reine Prüfung ist mit `node scripts/data/validate-game-data.mjs` möglich.

## IDs und Namen

Bestehende stabile IDs bleiben erhalten: Material-IDs `1..9`, Klassen-IDs wie `fighter` und Waffenform-IDs wie `sword`. Materialien besitzen zusätzlich einen stabilen `technical_key`. Sichtbare Namen sind Präsentationsdaten und keine technische Identität.

Seit v0.13.14 arbeitet die aktive Material-Fachlogik ID-nativ: Lager und Dungeon-Loot sind ID-keyed, Dungeon-Drops referenzieren `materialId`, Schmiede und Markt lösen Materialien über `materialId` auf, und Waffenberechnungen lesen Materialdefinitionen direkt über IDs. Materialnamen werden nur an Präsentations- und Altstand-Kompatibilitätsgrenzen aufgelöst.

Alte Saves mit Namensreferenzen bleiben ladbar. Beim Laden werden bekannte Materialnamen auf die bestehenden stabilen IDs migriert und der normalisierte Zustand wieder gespeichert. IDs werden niemals wegen einer Umbenennung des sichtbaren Namens neu vergeben.

## Persistenz

Kanonische Materialbestände verwenden `String(materialId)` als JSON-Schlüssel und tragen die `materialId` zusätzlich im Eintrag. Waffenslots und Schmiede-/Marktreferenzen besitzen `materialId` als technische Referenz. Sichtbare Namen dürfen als Anzeige-Snapshot vorkommen, sind aber nicht maßgeblich für Identität, Berechnung oder Zuordnung.

Dungeon-1-Sitzungsdaten wie aktiver Kampf, Gegner, Countdown und Live-Protokoll sind bewusst transient und werden nicht als neue Save-Struktur eingeführt. Die persistierte `dungeonTeamSlots`-Auswahl bleibt dagegen bestehen und kann beim nächsten Öffnen wiederverwendet werden.

## Balancequelle

Die Werte aus v0.13.10 wurden ursprünglich 1:1 in Tabellen übertragen. Die v0.13.10-Baseline-Dateien dienen weiterhin als eingefrorene Logik-/Kompatibilitätsschicht, sind aber keine zweite Balancequelle. Balanceänderungen gehören ausschließlich in `balancing/tables/`; generierte Dateien werden nicht manuell bearbeitet.

Dungeon-spezifische Laufzeit- und Kostenwerte gehören ebenfalls in `balancing/tables/dungeons.csv`. Seit v0.15.0 besitzt Dungeon 1 dort `duration_ms = 18000000` für fünf Stunden und `energy_cost = 0`, weil Energie im Dungeon vorerst weder verbraucht noch als Start-/Abbruchbedingung verwendet wird.

Die vollständige Entfernung der verbleibenden Legacy-Runtime ist ein eigener Angular-Cutover und unabhängig von der ID-Architektur. Sie soll nicht mit Balanceänderungen vermischt werden.
