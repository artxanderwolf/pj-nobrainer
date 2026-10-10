# pj-nobrainer

NoBrainer ist ein systemgetriebener Dungeon-, Crafting- und Management-Prototyp.

## Aktueller Stand

- Stabiler Referenzstand: `NoBrainer_GitHub_v0.12.2.html`
- Angular-Migration: Branch `migration/angular`
- Angular 21 (LTS), standalone und zoneless
- Der erste Migrationsschritt bindet den unveränderten HTML-Prototyp über eine kleine Kompatibilitätsschicht ein. Dadurch bleiben Gameplay, Save-Key und Timerlogik zunächst unverändert, während Web-Build und spätere Capacitor-Integration auf einer Angular-Basis vorbereitet werden.

## Lokal starten

```bash
npm install
npm start
```

## Produktions-Build

```bash
npm run build
```

Der Produktions-Build verwendet `/pj-nobrainer/` als Base-Href für GitHub Pages.

## Migrationsstrategie

Die Legacy-Datei bleibt während des Umbaus die funktionierende Referenz. Logik und UI werden anschließend schrittweise aus der Kompatibilitätsschicht in Angular-Dienste und -Komponenten überführt. Erst nach erfolgreichem Test werden diese Schritte nach `main` übernommen.
