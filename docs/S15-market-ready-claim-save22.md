# S15 – Marktverkäufe mit manueller Auszahlung

**App:** v0.15.0.0 · **Save:** 22 · **Basis:** `migration/angular` nach S14, `9a08322e224fea96ede54f7dc8b7b2b99f573e95`.

## Ziel (Großupdate Schrittplan v1.1, P04 / E-257–259)

Das S14-Zustandsmodell wird auf beide Marktauftragsarten übertragen:
`marketQueue` (queued) → `marketJobs` (active) → `marketReadyJobs` (ready) → claimed.

- Materialverkäufe reservieren `materialId` und Menge bei Annahme; Waffenverkäufe entfernen die `weaponId` aus dem Lager und behalten ihr `weaponSnapshot` für mögliche Stornierung. Das bisherige Reservierungsverhalten bleibt bestehen.
- Ein fertiger Verkauf belegt keinen Marktbetrieb, zählt aber zum Gesamtkontingent `fertige Märkte + Markt-Warteschlangenplätze`.
- Nickel wird **erst beim einmaligen Claim** über `Auszahlen` oder `Alle auszahlen` gutgeschrieben, nicht bei Fertigstellung oder Laden.
- IDs `market-job-N` sind unveränderlich und unabhängig von Materialname / Waffenname. Nach erfolgreicher Auszahlung wird der Ready-Auftrag entfernt und kann nicht nochmals ausgezahlt werden.
- Nur laufende und wartende Verkäufe sind abbrechbar; ihre reservierte Ware wird wie bisher zurückgegeben. Fertige Verkäufe lassen sich nicht mehr stornieren.
- Zeitgenaue Offline-Fertigstellungen und neue S13-Marktplätze werden weiterverwendet.

## Kompatibilität

Save21 → Save22 erweitert bestehende Marktaufträge um `jobId`, `status`; neue `marketReadyJobs` und `nextMarketJobNumber` sind persistent. Alte laufende/queued Verkäufe behalten ihre Reservierungen, Zeitpunkte, Nickelwerte und Waren-Snapshots. Keine doppelte Reservierung oder rückwirkende Auszahlung. Forge-Save21-System und Dungeon bleiben unverändert.

## Abnahme

`npm run check:market-claim`, `npm run check`, Angular-/Android-CI und Browser-Tests: 2 aktive + 5 Queue = maximal 7, beide Warentypen, 1× Nickel, doppelte Klicks, Storno, Neustart, Save21-Import/Save22-Export, Offline-Fortschritt. Draft/Feature-Branch bis zur ausdrücklichen Veröffentlichungsfreigabe.
