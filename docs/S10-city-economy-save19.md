# S10 – Nickelpreise und Migration alter Bauansprüche

**App-Version:** 0.10.0.0  
**Save-Version:** 19 (zusätzliches persistentes Feld `state.cityEconomy`)  
**Basis:** `migration/angular` @ `4eebd57d14d3f70391d9ef8ea372fa78c845c1b2`  
**Feature-Branch:** `feature/s10-city-economy-v0.10.0.0`

## Freigegebene Balance (12.11.2026)

- Grundpreise Nickel: Schmiede/Markt 5.000, Teamgebäude und Stadterweiterung 3.000, Bauhütte/Taverne/Runenwerkstatt 20.000.
- Zentrale Eldravar-Preisformel: Grundpreis × `ECONOMY_BALANCE.progressionCostMultiplier` × Wachstum.
- Wachstum: weitere Gebäude ×1,2, bezahlte Stadterweiterungen ×1,5.
- Grenzen: Schmiede 10; Markt 10; Teamgebäude 10; Bauhütte 2; Taverne 10; Runenwerkstatt 2.
- Die erste Instanz jedes Gebäudetyps ist kostenlos. Startstadt und sechs Startgebäude bleiben aus S07 erhalten; Runenwerkstatt wird hier nicht vorzeitig freigeschaltet.
- Keine feste spielmechanische Obergrenze für Stadterweiterungen; sichere numerische/rastertechnische Grenzen gelten weiterhin.

## Einmalige Migration

Beim Bootstrapping werden bereits bezahlte `upgrades.forgeSlots`, `upgrades.marketSlots` und vorhandene Team-IDs mit aktuellen Gebäudeinstanzen abgeglichen.
Fehlende Gebäude entstehen mit stabilen IDs, ohne Nickel abzubuchen. Bestehende Job-/Arbeiter-/Team-Verknüpfungen, Positionen und Alt-Slotzahlen werden nicht zurückgesetzt. Es wird keine neue Logik auf Materialnamen oder Legacy-Gebäudebezeichner gestützt.

Wenn alle freien 2×2-Flächen belegt sind, wächst die Stadt automatisch um 4 Spalten nach rechts, bis alle berechtigten Instanzen platziert sind. Diese Flächen vergrößern nur den persistierten Rasterstand und zählen nicht als bezahlte Expansionen. `cityEconomy.migrationVersion=1` verhindert erneut entstehende Gratis-Ansprüche beim Neustart.

Bereits in der S09-Testphase ohne Kosten erworbene Stadtfläche bleibt erhalten und wird **nicht rückwirkend berechnet**.

## Neue bezahlte Stadterweiterungen

In der Stadt-UI sind vier Richtungen verfügbar. Der Preis wird vor dem Kauf angezeigt. Bei unzureichendem Nickel sind die Schaltflächen deaktiviert; außerdem prüft der Core den Nickelbestand erneut. Der Core prüft den nächsten Layoutstand, bucht Nickel und erhöht `paidExpansions` als zusammenhängende State-Operation. Falls das lokale Speichern fehlschlägt, stellt der Angular-Service Layout, Zähler und Nickelstand wieder her.

## Abgrenzung

S10 führt **keine** S11-Bauzeiten, Baujobs oder Baustellen-Warteschlangen ein. Das bestehende alte Upgrade-UI für aktive Schmiede-/Marktkapazitäten wird erst in den Folgeschritten S11–S13 vollständig durch Gebäudekäufe und gemeinsame Queues abgelöst. S10 verbucht vorhandene ältere Rechte jetzt einmalig. Die Runenwerkstatt wird weiterhin erst im späteren vorgesehenen Schritt freigeschaltet. Für vollständige Team-Gebäudenavigation ist S12 vorgesehen.

## Abnahme

- `npm run check:city-economy`: Preisstaffelung, Maxima, 1/3/5 Altplätze und 10 Teams, Nickel-/Job-/Session-Erhalt, Save-Idempotenz, freie Migrationsfläche, bezahlte Expansion.
- `npm run check`, `npm run build`, Angular- und Android-CI.
- Browser: alter Spielstand laden, Plätze/Teams prüfen, Stadterweiterungen kaufen, Speicherstand neu laden; Nickel und Positionen prüfen.
- Vor einem eventuellen Rückfall Save19 exportieren. Rückfall auf ältere App-Version mit Save18 darf nicht als verlustfreier Import versprochen werden.
