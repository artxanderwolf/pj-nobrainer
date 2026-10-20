# pj-nobrainer

NoBrainer ist ein systemgetriebener Dungeon-, Crafting- und Management-Prototyp.

## Aktueller Stand

- Stabiler Referenzstand: `NoBrainer_GitHub_v0.12.2.html` auf `main`
- Angular-Migration: Branch `migration/angular`
- Angular 21, standalone
- Der unveränderte HTML-Prototyp bleibt während der Migration die Referenz für Gameplay, Save-Daten und Regressionstests.

## Aktueller Migrationsschritt

Die Angular-Hülle übernimmt jetzt zwei zentrale Infrastrukturaufgaben, ohne die Spielmechanik umzuschreiben:

1. Der 250-ms-Game-Tick wird von Angular gestartet und beim Abbau der App wieder beendet.
2. Die LocalStorage-Zugriffe des Legacy-Saves laufen über einen Angular-Service. Save-Key und Save-Format bleiben unverändert.

Der Legacy-Code behält vorerst die eigentliche Zustandsstruktur, Save-Migrationen und Gameplay-Funktionen. Eine explizite Kompatibilitätsschicht adaptiert ausschließlich den bekannten v0.12.2-Quelltext und bricht mit einer klaren Fehlermeldung ab, falls die erwarteten Anker nicht mehr vorhanden sind. Dadurch werden Abweichungen nicht stillschweigend akzeptiert.

## Lokale Entwicklung

```bash
npm install
npm start
```

## Produktions-Build

```bash
npm run build
```

Der Produktions-Build verwendet `/pj-nobrainer/` als Base-Href für GitHub Pages.

## Prüfungen

`npm run build` führt vor dem Angular-Build automatisch die Core-, Ownership-, Adapter- und Legacy-Prüfungen aus.

## Migrationsstrategie

Logik und UI werden schrittweise aus der Kompatibilitätsschicht in Angular-Dienste und -Komponenten überführt. `main` bleibt bis zur erfolgreichen Prüfung der jeweiligen Migrationsstufe der stabile Rückfallstand.
