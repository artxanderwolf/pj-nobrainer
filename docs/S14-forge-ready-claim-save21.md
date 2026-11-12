# S14 – Schmiedeaufträge: Ready und bewusstes Abholen

**Entwicklungsversion:** v0.14.0.0 · **Save:** 21 · **Basis:** S13 auf `migration/angular`, Commit `a81fa5c2bf0924d072d98763aa6799d196105000`.

## Fachverhalten (Großupdate-Schrittplan v1.1, P04 / E-257 bis E-259)

- Jeder neu angenommene Schmiedeauftrag erhält die stabile technische `jobId` (`forge-job-N`). Die Materialien werden wie bisher **einmalig bei Annahme** reserviert.
- Lebenszyklus: **queued → active → ready → claimed**. `forgeQueue` enthält wartende Aufträge; `forgeJobs` enthält nur laufende; `forgeReadyJobs` enthält fertiggestellte, noch nicht abgeholte Aufträge. Der Claimed-Zustand ist terminal: der Auftrag wird nach genau einer Abholung entfernt. Ein zweiter Claim derselben ID bleibt wirkungslos.
- Nach Herstellung wird die fertige Waffe **nicht** ins Waffeninventar geschrieben. Ein Ready-Auftrag belegt keinen Produktionsbetrieb, aber weiterhin das Gesamtlimit `fertige Schmieden + Schmiede-Warteschlangenplätze`.
- Die zwei sichtbaren Aktionen „Abholen“ und „Alle abholen“ übertragen Waffen **erst beim Klick** ins Inventar, jeweils mit einmaliger Inventar-ID.
- Die bisherige gemeinsame S13-Warteschlange und der zeitgenaue Offline-Durchlauf bleiben erhalten. Bauabschlüsse und Fertigstellungen können offline stattfinden, das Einlagern nicht.
- Alte aktive/queued Jobs werden beim Laden in-place mit stabilen IDs versehen; bereits reserviertes Material, ausgewählte Slots, Start-/Endzeiten, Waffendaten und Laufstatus bleiben erhalten. Keine Nachreservierung von Materialien oder automatische zusätzliche Waffe.
- Kein Eingriff in Markt-Claim/-Auszahlung (S15), Dungeon, Gebäudegröße, Helferregelung (S16) oder Waffenwerte.

## Persistenz

Save21 führt `forgeReadyJobs: IdentifiedForgeJob[]` und `nextForgeJobNumber: number` ein. Persistierte `forgeJobs` und `forgeQueue` erhalten `jobId` und `status`. Die Migration ist deterministisch und idempotent, bleibt aber kompatibel mit älteren Save20-Dateien. Der laufende Aktualisierungstimer speichert den erfolgreichen Übergang nach Ready; der Claim wird unmittelbar gespeichert.

## Tests

`npm run check:forge-claim` deckt ab: 2 aktive Schmieden plus 5 Queueplätze = maximal 7 offene Aufträge, Freigabe des Betriebes trotz belegten Gesamtkontingents, keine stille Einlagerung, Offline-Zeitachse, Export/Import, doppelte Claim-ID, Migration laufender und wartender Altaufträge.

Zusätzlich: `npm run check`, Angular-Browserregressionen und Android-CI. Webveröffentlichung erst nach gesonderter Freigabe. Die funktionierende v0.13.0.0 bleibt unangetastet.
