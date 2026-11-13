# S16 – Grundarbeiter, optionale Gebäudehelfer und reproduzierbare Restarbeit

**App** v0.16.0.0 · **Save23** · **Basis**: veröffentlichter Stand S15 `b6d2659731ebf01634e09dd152a083f742221ae6`.

## Fachliche Grundlage

Schrittplan v1.1 **S16** und Masterliste **P05 / E-252–255 / E-287 / K-008/009**.

- Fertige Schmieden und Märkte arbeiten auch ohne Kadercharakter mit einem festen Grundarbeiter (**100 %**). Der Grundarbeiter wird nicht als Held gespeichert und benötigt keinen Kaderplatz.
- Je aktive Gebäudeinstanz `buildingInstanceId` darf höchstens ein `workerCharacterId` zugewiesen werden. Der gleiche Charakter darf weder in einem zweiten Gebäude noch in einem Dungeonteam (auch einem bereits zusammengestellten, aktuell untätigen Team) gleichzeitig zugewiesen sein. Er muss im Team zuvor bewusst freigemacht werden.
- Optionaler Helfer **120 %** Arbeitstempo. Er beschleunigt nur den eigenen Betrieb, nicht alle Gebäude seiner Art. Gemeinsame Queue und die getrennten `ready`-/`claim`-Bestände aus S14/S15 bleiben unverändert.
- Für **jede** aktive `forge-job-N`- oder `market-job-N`-Instanz wird eine stabile Bindung zu genau einem aktiven Gebäude erstellt. Die Arbeit wird als `workRemainingSeconds` bei `workAnchorAt` und `workSpeed` gespeichert. Bei Helferwechsel wird nur noch nicht geleistete Arbeit mit neuer Geschwindigkeit umgerechnet. Es gibt keinen Neustart des Auftrags; die Deadline wird entsprechend verschoben.
- Frei werdende Betriebe starten bestehende Queue-Jobs zu den tatsächlichen historischen Abschlusszeitpunkten, auch während einer längeren Offlinephase und bei einem zeitgleich fertiggestellten Neubau. Die Betriebs-/Auftragsbindung ist von der Rasterposition unabhängig, ein Gebäudemove verliert keine Arbeit.
- Die bisherigen wertabhängigen Herstellungszeiten bleiben erhalten. Für neue Schmiedeaufträge gilt nach Berechnung ein Minimum von Dolch **20 s**, 1H-Schwert **45 s**, 1H-Axt **45 s**, 2H-Schwert **75 s**, 2H-Axt **75 s**, Bogen **90 s**, Stab **50 s**; erst danach greift gegebenenfalls der 120-%-Faktor.
- Bereits angenommene (aktive oder wartende) Altaufträge behalten ihre gespeicherten Grunddauern und Reservierungen. Es gibt keinen rückwirkenden Preis-/Materialeingriff.

## Save22 → Save23

Persistente Zusätze nur an existierenden IDs:

`cityLayout.buildings[].workerCharacterId` und `.activeJobId` existieren bereits in Save22, sind nun belegt.
Laufende Forge-/Market-Aufträge ergänzen `buildingInstanceId`, `workRemainingSeconds`, `workAnchorAt`, `workSpeed`.
Alte aktive Jobs erhalten deterministische Gebäude-IDs und ein 100-%-Snapshot ohne Änderung von `startedAt`/`finishesAt`.
Idempotente Wiederholung beim Laden ist verpflichtend; doppelte Helferbuchung wird bei Import validiert.

## Tests und Abnahme

`npm run check:city-workers`: 1/2/5 Betriebe, stabile Zuordnung, 60 s → 50 s, mehrfacher Wechsel mit 100/120 %, Team-/Doppelbuchungsverbote, exakte Weiterrechnung mit Offline-Queue, Mindestzeiten, Save22-Import und Save23-Snapshot. Bestehende Angular-/Android-CI und Browser-Smokes zusätzlich.

**Freigabe:** Ausschließlich nach ausdrücklicher Genehmigung. PR bleibt Draft; der veröffentlichte GitHub-Pages-Stand v0.15.0.0 wird nicht verändert.
