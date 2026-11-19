# Großupdate v0.23.0.0 – Entwurf der Release Notes (Etappe F)

**Status:** Vorläufiger Changelog, **keine gesonderte Abschlussfreigabe**. Basierend auf dem Großupdate-Schrittplan v1.1 (S01–S23) und dem in GitHub vorgefundenen Entwicklungsstand. Die endgültige Versionsnummer des Abschlussreleases sowie finale Balance werden erst im Release-Gate festgelegt.

## Dungeon, Kampf und Beute (S01–S04)

- Gegnerzahl orientiert sich an der kampffähigen Ausgangsgruppe eines Laufs.
- Gegner-XP und Materialwürfe wurden überarbeitet; erfolgreiche Materialwürfe erfolgen mit 60 %.
- Android- und Browser-Zurücknavigation wurden in die gemeinsame Oberfläche integriert.

## Schmiede und Kader (S05–S06)

- Verständlichere Materialauswahl mit Beständen und Werten.
- Waffenvergleich mit separater aktueller Waffe und geeigneten Ersatzwaffen auf großen und kleinen Bildschirmen.

## Stadt und Gebäude (S07–S12)

- ID-basiertes Stadtraster mit verschiebbaren Gebäuden und Erweiterungen.
- Gespeicherte Bauplätze, alte Ausbaurechte und freie Anfangsgebäude werden überführt.
- Bauhütte und Bauaufträge sowie eigene Gebäudezugänge für Teams.

## Produktion, Markt und Arbeiter (S13–S16)

- Gemeinsame Warteschlangen über mehrere Gebäude.
- Fertige Schmiede- und Marktaufträge werden bewusst abgeholt bzw. ausgezahlt.
- Kaderhelfer beschleunigen geeignete Aufträge, ohne gleichzeitig in Dungeons eingesetzt werden zu können.

## Rassen, Heilung und Taverne (S17–S19)

- Fünf Rassen mit eigenen IDs und Emblemfarben.
- Hochelfen-Heilung ersetzt die frühere Heilerklasse; alte Charaktere werden migriert.
- Zwei persistente Bewerber je Taverne; täglicher Wechsel nach Europe/Berlin.

## Runen und Werkstatt (S20–S23)

- Sechs Runenausführungen: Präzision, Durchschlag und Geschwindigkeit mit zwei Stufen.
- Runensockel entsprechend Waffenseltenheit, additive Boni und kostenloser Wechsel.
- Altwaffen-Spezialeffekte werden auf eigene Runen migriert; neue Waffen benötigen kein Spezialbauteil mehr.
- Erste Runenwerkstatt wird nach eingesammeltem Runenfund freigeschaltet.
- 0,1 % Runenchance je geeignetem Gegner im Trainingslager, unabhängig vom Materialwurf.

## Technisches / Spielstand

- Gemeinsame Angular- und Capacitor-Codebasis.
- Webstand v0.23.0.0, Save 27; Spielstandmigrationen behalten historische Daten soweit nach den vorhandenen Tests bestätigt.
- Vor dem ersten Update einen JSON-Spielstandexport erstellen.
- Bestehende signierte Android-Releases werden nicht automatisch aktualisiert; separate Android-Freigabe ist erforderlich.

## Noch vor Abschluss zu bestätigen

Reale Tests auf Desktop, Smartphone und Android, Migrationsfälle aus eigenen Altspielständen, mehrere parallele Dungeon-Teams, langlaufende Offline-Aufträge, Produktionsabholungen ohne Doppel-Claim, Runen-Grenzwerte und endgültige Balance.
