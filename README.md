# Smiths of Eldravar

Systemgetriebenes Dungeon-, Crafting- und Stadtmanagementspiel mit einer gemeinsamen **Angular-21-Codebasis** für Browser und Android (Capacitor 8).

## Aktueller Entwicklungsstand

- Entwicklungs- und Web-Testbranch: `migration/angular`
- S20–S23 (Etappe E) integriert: Runen, Altwaffenmigration, Runenwerkstatt und Dungeon-1-Runendrops
- App-Version: **v0.27.0.0**; Save-Version: **28**
- Großupdate v2: Etappe A integriert; Etappe B/S05 vom Nutzer abgenommen; S06/S07 mit sanfterer Gegnerkurve, unabhängigen XP und Zugangsregeln 5/50/50/5 % zur Abnahme vorbereitet. [Berechnungen und Abnahme](docs/grossupdate-v2-etappe-b-s06-s07.md).
- Etappe F/S24 des vorherigen Großupdates: Gesamtprüfung und Releasevorbereitung – gesonderte Abschlussfreigabe erforderlich
- Der ursprüngliche HTML-Prototyp `NoBrainer_GitHub_v0.12.2.html` bleibt ausschließlich als historische Kompatibilitäts-/Regressionstestquelle im Repository. Er ist **nicht** der produktive Spielstand.
- Eine neue Webversion bedeutet **nicht** automatisch einen Android-Release. Eine Android-Veröffentlichung erfordert die gesonderte Freigabe und den bestehenden Release-Signierschlüssel.

## Lokale Entwicklung

```bash
npm install
npm start
```

## Prüfungen und Builds

```bash
npm run check
npm run build
npm run build:pages
npm run android:sync
```

Die Checks umfassen u. a. Kämpfe, Teams, Stadt/Gebäude, Dungeon- und Offline-Fortschritt, Schmiede/Markt, Spielstandtransfers, Rassen, Runen, Migrationen und Android-Integrationsregeln. Browser-End-to-End-Prüfungen laufen zusätzlich in der GitHub-CI; reale Endgerätetests sind separat erforderlich.

## Release- und Rückfallverfahren

Die öffentliche Web-Testversion wird über GitHub Pages aus `migration/angular` gebaut. Android nutzt denselben Angular-Code mit Capacitor; signierte Android-Releases werden **nicht** durch einen normalen Web-Merge freigegeben.

Die S24-Integrationsmatrix, offenen manuellen Abnahmetests, Nachweise, Balancefragen und Fallbacks sind unter [docs/S24_GESAMTABNAHME_RELEASEVORBEREITUNG.md](docs/S24_GESAMTABNAHME_RELEASEVORBEREITUNG.md) dokumentiert. Vor Save-Migrationen ist ein JSON-Export sinnvoll; ein moderner Save darf nicht ohne Prüfung in ältere Versionen zurückimportiert werden.
