# S08 – Neue ID-Stadtansicht mit funktionierenden Gebäudezugängen

## Basis und Abgrenzung
- Basis `migration/angular` SHA `7d2077156ec85db5aeba10076483186de06d6f4e`, S07 / Save18, Nutzerabnahme erteilt.
- Rückfall: `backup/s08-pre-city-grid-2026-11-11` am selben SHA.
- Neue App-Version 0.8.0.0 wegen vollständigem Stadtkarten-UI-Cutover; Save-Version bleibt 18.
- S08 darf **keine** Positionen, Gebäude-IDs, Materialbestände, Nickel, Baujobs oder gekaufte Slots verändern.

## Neue Stadt
- Die bisherige 256x465-Hintergrundgrafik mit 21 positionsgebundenen Hotspots ist entfernt. Es gibt **nur eine** Rasterstadt aus `state.cityLayout`.
- Sichtbare Gebäude erhalten Position, Fläche, Status, individuelle `buildingInstanceId`, `buildingTypeId` und `assetKey` direkt aus S07. Namen und Icons dienen nur als Anzeige, nicht als technische Identität.
- Anfang: Kader, Taverne, Schmiede, Markt, Team 1, Bauhütte im 12×8-Raster.
- Kader/Taverne/Schmiede/Markt öffnen die bestehenden Angular-/Runtime-Unterseiten; Team 1 öffnet die bestehende Team-Dungeonansicht mit Team-ID 1.
- Bauhütte ist sichtbar aber bis S11 nicht aktiv; neue Gebäudetypen, welche noch nicht freigeschaltet sind, bleiben deaktiviert.
- Weitere Direktzugänge unter der Karte: Dungeonweg, Materiallager, Waffenlager, Missionen. Das sind **keine** zusätzlichen Gebäude und besitzen keine Fake-IDs.
- Teams 2–10 ohne Stadtinstanz, die bereits bezahlt wurden, bleiben mit Übergangslinks erreichbar. Erst S10–S12 ersetzen diese durch korrekte individuelle Teamgebäude; es gibt weder neue Gebäude noch Gebühren in S08.

## Darstellung
- Ein responsives, scrollbar zugängliches CSS-Grid zeigt die gespeicherten Zellen.
- Auf schmalen Browsern ist horizontaler Touch-Scroll statt winziger Gebäudeschrift vorgesehen; Fokus, Keyboard und ARIA-Labels bleiben erreichbar.
- Farben/Emoji-Gebäudesymbole sind austauschbare Platzhalter. Sie können später über `assetKey` gegen echte Grafiken ersetzt werden.
- Keine neue Abhängigkeit, keine separate Mobile-Codebasis.

## Qualitätssicherung
- Reine Präsentationstests: sechs Gebäude-ID-Instanzen mit Raster-Koordinaten, stabile Asset-Keys, disabled-Zustand der Bauhütte und zukünftiger Gebäude, Teamfreischaltung und Team 2/5-Übergang.
- Browser-E2E: Raster- und Positionsprüfung, alle vier Gebäudezugänge, Dungeon, Material-/Waffenlager, Missionen und Team1, mobile Scrollbarkeit und keine alten Hotspots.
- Vorhandene Spielstand-, Legacy-, Kader-, Schmiede-, Markt-, Dungeon- und Android-Regressionen mit Save18 unverändert.
- GitHub Pages nur nach erfolgreichem Angular- und Android-Workflow.

## Manuelle Abnahme
1. Auf Smartphone Stadt öffnen, horizontal verschieben und alle sechs Gebäude sehen.
2. Kader, Taverne, Schmiede und Markt nacheinander durch antippen öffnen und wieder zurückkehren.
3. Team1, Dungeonweg, Material-/Waffenlager und Missionen öffnen.
4. Bereits vorhandene weitere Teams unter der Karte öffnen.
5. Bauhütte als noch nicht aktiv erkennen.
6. Alle Nickel-/Slot-/Waffen-/Team-/Jobdaten vor/nach Browserneustart vergleichen.

**Folgende Schritte werden nicht vorgezogen:** S09 verschieben/erweitern, S10 Kapazitätsrechte und Preisumrechnung, S11 Baujobs, S12 neue Teamgebäude.
