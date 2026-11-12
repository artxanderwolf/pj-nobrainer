# S12 – Teamgebäude als direkte Teamsteuerung

**Version:** v0.12.0.0 · **Spielstandformat:** Save20 (unverändert)

**Basis:** `migration/angular`, Merge S10/S11, Commit `7ea423e75bea1551733d65e5343d507a2ba25a4f`.

## Ziel / Vorgaben

Nach Schrittplan v1.1 S12 (P02/P03, E-016–017, E-096, E-282) besitzt jedes Team einen baubaren, fest zugeordneten Stadteingang. Team 1 bleibt kostenlos; maximal zehn Teams; kein separater alter Kaufknopf und keine doppelte Gebühr. Bestehende Expeditionen und Teams müssen unverändert bleiben.

## Umsetzung

- Jedes Teamgebäude ist über seine persistierte `buildingInstanceId` und `teamId` mit genau einem Team verbunden. Beim Antippen wird der vorhandene Teamdialog **direkt für diese ID** geöffnet. Die Dungeon-Navigation bleibt für die Übersicht und den Dungeonweg bestehen, ohne dort weitere Teamkäufe anzubieten.
- Neue Teamgebäude werden ausschließlich im S11-Stadtbaumodus gekauft (S10-Nickelpreis und S11-30-Minuten-Bauauftrag). **Erst bei Bauabschluss** wird die neue `TeamSessionState` angelegt.
- Die alte Team-Kaufaktion ist bei vorhandener ID-basierter Stadt gesperrt; dadurch kann sie weder eine zweite Gebühr abbuchen noch ein Team parallel zur Baustelle doppelt anlegen.
- Alte Spielstände, die Team 2–10 bereits vor S12 über die bisherige Team-Kaufoberfläche besaßen, erhalten beim Laden jeweils einmalig das passende **kostenlose 2×2-Gebäude**. Bestehende Gebäude, IDs, laufende Runs und Nickelbeträge bleiben erhalten. Falls die Stadt voll ist, wird für diese Altansprüche automatisch kostenlos nach rechts erweitert.
- Die Nachmigration ist **idempotent**: Keine zusätzliche Migrationsversion und kein Save21 nötig. Die schon vorhandenen Save20-Felder `cityLayout` und `cityEconomy` werden weiterverwendet.
- Der zentrale Dungeonweg bleibt als allgemeiner Zugang zur Dungeon-Übersicht erhalten und ist **kein gemeinsames Team-Kaufsymbol**. Der separate alte Kaufknopf entfällt vollständig.

## Abgrenzung / Risiko

Die Hauptverwaltung von Schmiede und Markt sowie die S13-Auftragsverteilung sind nicht betroffen. Die Dungeon-Sessions werden bei der Teamgebäude-Migration nicht ersetzt. Spieler mit mehr als den zulässigen zehn Team-IDs werden nicht um zusätzliche Gebäude erweitert; die gespeicherten Sessions bleiben im Spielstand. S12 wird zuerst auf einem Feature-Branch getestet und erst nach ausdrücklicher Freigabe auf GitHub Pages veröffentlicht.

## Abnahme

`npm run check:city-team-buildings`, `npm run check`, Angular-/Android-CI; 1 und 10 Altteams, mehrere aktive Sessions, korrekte `teamId` je Gebäude, kostenloses Nachrüsten, keine Doppelzahlung, S11-Teamgebäude nach Bauzeit, Save20-Export/Import, Neustart ohne Zusatzansprüche.
