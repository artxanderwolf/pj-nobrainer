# NoBrainer Data Architecture v1

Die kanonischen Balance- und Contentdaten liegen in `balancing/tables/*.csv`. Die CSV-Dateien sind bewusst Excel-kompatibel und Git-freundlich: Sie können in Excel bearbeitet werden, benötigen aber keine Excel-Bibliothek in Web- oder Android-Builds.

## Datenfluss

`balancing/tables/*.csv` → Validierung → generierte TypeScript-Daten → bestehende Game-Cores → Angular/Legacy-Kompatibilität.

`npm start` und der vorhandene Build-/Check-Ablauf führen `scripts/prepare-legacy-runtime.mjs` aus. Dabei werden die Tabellen zuerst validiert und `src/app/game/data/generated/*.generated.ts` neu erzeugt. Ungültige Referenzen, doppelte IDs oder Werte außerhalb unterstützter Bereiche stoppen den Vorgang mit einer Fehlermeldung.

Manuell kann die Erzeugung mit `node scripts/data/build-game-data.mjs` gestartet werden; eine reine Prüfung ist mit `node scripts/data/validate-game-data.mjs` möglich.

## IDs und Namen

Bestehende IDs aus v0.13.10 bleiben in Phase 1 erhalten. Material-IDs `1..9`, Klassen-IDs wie `fighter` und Waffenform-IDs wie `sword` werden nicht neu vergeben. Materialien besitzen zusätzlich einen stabilen `technical_key`, damit sichtbarer Name und technische Identität künftig getrennt werden können.

Der sichtbare `display_name` darf erst dann unabhängig umbenannt werden, wenn die noch vorhandenen Namensreferenzen in Inventar, Schmiede, Markt, Waffen und Savegame schrittweise auf IDs umgestellt wurden. Diese vollständige ID-Migration ist ausdrücklich **nicht** Teil von Phase 1.

## Phase 1

Phase 1 ändert keine Gameplayregel und kein Save-Format. Die Werte aus v0.13.10 wurden 1:1 in Tabellen übertragen. `game-core.ts` und `economy-core.ts` verwenden vorübergehend die v0.13.10-Baseline-Dateien als Logik-/Kompatibilitätsschicht und überschreiben deren Datenobjekte beim Modulstart mit den generierten Tabellenwerten. Dadurch bleiben bestehende Imports, Funktionen und Legacy-Bridges unverändert nutzbar.

Die Baseline-Dateien sind ein Übergangsschutz und keine zweite zu pflegende Balancequelle. Balanceänderungen gehören ausschließlich in `balancing/tables/`; die generierten Dateien werden nicht manuell bearbeitet.

## Nächste Phase

Nach erfolgreichem Regressionstest werden verbliebene Namensreferenzen systemweise auf IDs migriert. Erst danach können die temporären v0.13.10-Baseline-Datendefinitionen vollständig entfernt werden. Savegame-Migrationen erfolgen separat und nicht zusammen mit Balanceänderungen.
