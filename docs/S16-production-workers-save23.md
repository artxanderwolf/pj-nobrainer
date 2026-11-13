# S16 – Grundarbeiter, Zusatzhelfer und Gebäudegebundene Aufträge

**Featureversion** v0.16.0.0 · **Save** 23 · Basis `migration/angular` bei `b6d2659731ebf01634e09dd152a083f742221ae6` (S15).

## Umsetzung P05, E-252–255, E-287, K-008/009

- Jedes fertige Schmiede- und Marktgebäude verfügt ohne Anwerbung über einen NPC-Grundarbeiter (100 %). Je Betrieb kann genau ein zusätzlicher Kadercharakter (`workerCharacterId`, stabil) eingestellt werden. Geschwindigkeit 120 %, keine weitere Stapelung.
- `buildingInstanceId` und `activeJobId` ordnen laufende `forgeJobs`/`marketJobs` einzelnen realen Betriebsgebäuden zu. Die Warteschlange bleibt pro Gebäudetyp gemeinsam. Je Betrieb läuft höchstens ein Auftrag, bereitliegende Aufträge belegen keinen Betrieb.
- Ein Kaderheld darf nur einen Arbeitsplatz haben, während einer aktiven Dungeonexpedition keinen weiteren. Umgekehrt blockiert eine belegte Betriebszuweisung den Dungeonstart und die Teamplatzauswahl.
- Bei Helferwechsel wird mit der bisherigen Geschwindigkeit bereits erbrachte Arbeit vom Rest abgezogen, dann die verbleibende physische Arbeitsmenge zur neuen Geschwindigkeit umgerechnet. (60 s / 1.2 = 50 s). Offline-Fortschritt erfolgt anhand der absoluten Fertigstellungszeitpunkte, einschließlich nachrückender Warteschlangenaufträge und Bauabschlüssen.
- Schwert-/Axtformen und andere Waffen nutzen die bestehende wertabhängige Grundformel plus Mindestzeit `max(wertabhängig, Mindestzeit)`: Dolch 20 s; 1H-Schwert 45 s; 1H-Axt 45 s; 2H-Schwert 75 s; 2H-Axt 75 s; Bogen 90 s; Stab 50 s.
- Die S14/S15-Abhol- und Auszahlungsaktionen sowie Material-/Waffenreservierungen bleiben erhalten.

## Save22 → Save23

Persistiert werden nun Auftragsfelder `buildingInstanceId`, `workRate` und `remainingWorkSeconds` sowie die Zuordnung `cityLayout.buildings[*].activeJobId`. Das bestehende `workerCharacterId`-Feld wird aktiv genutzt. Alte laufende Jobs behalten ihre gespeicherten Endzeitpunkte: Die Migration weist Gebäude zu, ohne alte Restarbeit zurückzusetzen. Aufträge erhalten erst ab dem jeweiligen Helferwechsel den neuen Geschwindigkeitsmultiplikator.

Bei ungültiger doppelter Kaderzuordnung wird deterministisch nur die erste gültige Beschäftigung beibehalten. Ein laufender Auftrag ohne zuordenbares fertiges Gebäude ist ein sichtbarer Save-Integritätsfehler und wird nicht stillschweigend entfernt.

## Abnahme & Rückfall

`npm run check:production-workers`, vollständige `npm run check`, Angular- und Android-Workflows. Abnahmefälle: 60→50, Helfer rein/raus bei partieller Restarbeit, Offline-Replay, Werkstatt-/Marktaufträge, Save22-Import/Save23-Roundtrip und Dungeon-Exklusivität. GitHub-Fallback: Merge-Commit S15 `b6d2659731ebf01634e09dd152a083f742221ae6`. **Draft-PR: kein Merge oder Pages-Deploy ohne erneute ausdrückliche Freigabe.**
