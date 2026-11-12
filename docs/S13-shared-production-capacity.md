# S13 – Gemeinsame Betriebswarteschlangen und aktive Gebäudeplätze

**App:** v0.13.0.0 · **Save:** 20 (unverändert) · **Basis:** `migration/angular` nach S12, Commit `0208012328c9912f466c2017188a422d0f46db26`.

## Regelwerk

S13 laut Schrittplan v1.1, P04 / E-250, E-256, E-258: Jede fertiggestellte, aktive Schmiede und jeder Markt liefert **genau einen** aktiven Bearbeitungsplatz. `status='underConstruction'` und `status='inactive'` liefern keine Kapazität. Es gibt weiterhin **eine gemeinsame** Schmiedeliste (`forgeJobs`/`forgeQueue`) und eine gemeinsame Marktliste (`marketJobs`/`marketQueue`) pro Stadt; keine Kopien der Jobs pro Gebäude.

Die aktiven Plätze werden aus `cityLayout.buildings` berechnet. Die alten `upgrades.forgeSlots` und `upgrades.marketSlots` bleiben zur Save20-Altstandmigration verfügbar, beeinflussen die laufenden Aufträge jedoch nicht mehr. Der Angular-Upgrade-Pfad lässt keine neuen kostenpflichtigen Käufe dieser abstrakten Slots zu. Die vorhandenen **Warteschlangen-Upgrades** `forgeQueue`/`marketQueue` funktionieren weiterhin.

## Offline-Fortschritt

Bei einem während Offlinezeit fertiggestellten Neubau wird das System chronologisch vorgespult:
1. Schon laufende Schmiede- und Marktaufträge bis zum Bauzeitpunkt mit der bisherigen Betriebszahl fortschreiben.
2. Bauabschluss mit echter Endzeit aus S11 markieren.
3. Ab diesem Zeitpunkt jeweils nächsten angenommenen Job aus der gemeinsamen Queue in einen freien Betrieb einplanen.
4. Verbleibende Offlinezeit wie bisher fortschreiben.

Dieser Prozess ist idempotent und verändert keine bereits reservierten Materialien oder Marktgegenstände.

## Abgrenzung

S14 führt in der Schmiede `ready/claim` statt automatischer Einlagerung ein; S15 überträgt denselben bewusst ausgelösten Abhol-/Auszahlvorgang auf den Markt. **S13 ändert noch nicht die bestehende Sofortfertigstellung und Sofortauszahlung.** Der spätere S16-Helfer bleibt unberührt.

## Abnahme

- `npm run check:city-production-capacity` und vollständige bestehende Checks.
- 1/2/5 fertige Schmieden und Märkte, verschiedene Queuelängen, volle Auftragskontingente.
- Offline-Bauabschluss an exakt richtiger Zeitgrenze, Alt-Active-Jobs unverändert, keine doppelte Queue-Aufnahme oder Materialreservierung.
- Browser-, Web-/Android-Build und Ingame-Hilfe; Save20-Export/Import.
- Kein Merge und kein GitHub-Pages-Release ohne ausdrückliche Freigabe.
