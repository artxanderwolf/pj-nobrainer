# Großupdate v2 · Etappe F · S17 Integrationsprüfung

Geprüfter Angular-Stand: `2a3ea720312d8f3dccccead1bfcbb97aa53eb626`. Der Quellbaum des Merges stimmt mit dem geprüften PR-Commit `50ef9aa` überein. Web/App 0.27.0.3, Android-Buildcode 18, Save 28. Die Integrationsprüfung erforderte keine Schemaänderung.

| Prüfbereich | Nachweis |
|---|---|
| Vorhandener Save 14 | Lokal in isolierten Chrome-Profilen mit Web-Produktionsbuild, mobiler Fenstergröße und Android-Webbuild auf Save 28 geladen. Die 3 Charaktere, 14 Waffen, Bestände der 8 Materialarten, Gold, Waffenpreise und gespeicherten Marktwerte blieben erhalten. Erneutes Laden war stabil. |
| Save 27 und Qualitätsbestände | Chrome-Regression für Material-ID und Qualität, gemischte Schmiederezeptur, erhaltene Waffen- und Auftragswerte, Abholung, Verkauf, Storno und erneutes Laden bestanden. |
| Export und Import | Automatisierte Save-Prüfungen für v8 bis v28, ungültige und zukünftige Saves, sowie Browserprüfung für JSON-Import und -Export. |
| Dungeon und Fortschritt | Laufende Kampf-Snapshots, Offline-Fortschritt, Dungeonzugänge, Rundenspeicherung, Runen und 462 Material-/Qualitätspaare sind durch die vorhandenen Regressionen abgedeckt. |
| Stadt, Unterkunft und Teams | Automatisierte Regressionen zu Gebäuden, Unterkunft, bis zu zehn Teams, exklusiver Zuordnung und mehreren Produktions- und Dungeonprozessen bestanden. |
| Schmiede und Markt | Automatisierte Prüfungen zu Offline-Fertigstellung, Ready-Aufträgen, Preis-Snapshots, Baukapazität, Storno und einmaliger Gutschrift bestanden. |
| Web und Android | 94 lokale Projektchecks, Chrome-Start, Produktionsbuild, Android-Webbuild, Capacitor und nativer Debug-Build bestanden. Beide GitHub-CI-Läufe des PR bestanden. Die bekannte Web-Bundlewarnung bleibt bei rund 687 kB. |

- [Angular CI](https://github.com/artxanderwolf/pj-nobrainer/actions/runs/45242931534)
- [Android CI](https://github.com/artxanderwolf/pj-nobrainer/actions/runs/45242931537)
- [Dungeon- und Angular-Pull-Request](https://github.com/artxanderwolf/pj-nobrainer/pull/211)

## Offene Gesamtprüfung in S18

S18 folgt nach Abnahme von S17. Der Android-Webbuild wurde im Browser geprüft. Ein laufendes Android-Gerät war nicht verbunden. Installation, Update mit vorhandenem Spielstand, System-Zurück, Dateiexport und Nutzung auf dem echten Gerät bleiben daher Teil der Geräteprüfung. Der öffentliche Android-Kanal liefert weiterhin 0.27.0.2 / Code 17.

Für die manuelle Abnahme stehen der Webtest auf echtem Smartphone, ein vorhandener Spielstand mit offenen Aufträgen, parallele Teams, Kontrolle der D4/D5-Werte in neuen und laufenden Kämpfen sowie ein Performance-Test mit großem Bestand an. Für den Release-Check sind Changelog, Fallback und separate Android-Freigabe vorgesehen. Der vorherige veröffentlichte Stand ist auf `61ff1d1` und im signierten Android-Release v0.27.0.2 / Code 17 dokumentiert.
