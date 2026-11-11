# S07 – ID-basiertes Stadt- und Gebäudemodell
**App-Version:** 0.7.0.0 (größeres neues System)  
**Save-Version:** 18 (neues persistentes Feld `state.cityLayout`)  
**Basis:** `migration/angular` @ `bd006b139474e356260567ae71da84e795d8fe12`  
**Rückfallbranch:** `backup/s07-pre-city-model-2026-11-11`

## S07-Umfang und Abgrenzung
- Rechteckiges Raster `grid={minX:0,minY:0,width:12,height:8}`, koordinatenbasiert.
- Sechs automatisch erzeugte 2×2-Startgebäude, ohne Kollision:
  - `building-1`: roster (0,0)
  - `building-2`: tavern (4,0)
  - `building-3`: forge (8,0)
  - `building-4`: market (0,4)
  - `building-5`: team (4,4), teamId 1
  - `building-6`: builder (8,4)
- Siebter Typ `runeWorkshop` nur als Definition, nicht als Startgebäude.
- Pro Instanz: persistente `buildingInstanceId`, `buildingTypeId`, x/y/width/height,
  status, `unitSlots`, Team-ID, Arbeiter-/Job-Bezug und typstabiler `assetKey`.
- `nextBuildingNumber:7` hält weitere IDs stabil. Validierung verwirft doppelte
  IDs, Kollisionen, Ausreißer, ungültige Typen und doppelte Team-Zuordnung.
- Beim Start fehlendes `cityLayout` einmalig ergänzen, aus Save17 importierte
  Daten unverändert lassen, save18 persistieren. Ein bereits vorhandenes
  korrektes Stadtlayout bleibt beim Laden identisch; beschädigte Layouts
  werden nicht durch kostenlose neue Gebäude überschrieben.
- Der aktive Legacy-Load-Adapter reicht das Stadtfeld verlustfrei an den
  Angular-State weiter. Alle Gebäuderegeln bleiben im Angular-Game-Core.

## Absichtlich NICHT Teil von S07
- Keine neue sichtbare Gebäude-/Stadtkarte (S08).
- Kein Bauen, Bewegen, Flächenerweitern (S09).
- Keine Anrechnung bestehender gekaufter Forge-, Markt- oder Teamplätze
  (S10) und keine Gebühren-/Rechteänderungen.
- Keine Baujobs/Bauhüttentimer (S11) oder Team-Gebäudenavigation (S12).
- Kein Produktionstimer, Materialinventar, Mission, Dungeon oder Waffenwert geändert.

`unitSlots` ist in S07 ein strukturelles Attribut pro Gebäude – noch **keine**
autoritative Umstellung von bisherigen `upgrades` oder Team-Slots.

## Tests und Abnahme
1. `npm run check:city-layout`: Typ- und ID-Stabilität, Startkoordinaten, 24
   belegte Rasterzellen, Kollision/Bounds, Save17→18, Idempotenz und
   unveränderte Alt-Slots, Teams, Heiler, Jobs und Waffen.
2. `npm run check`: bestehende Core-/Ownership- und Saveprüfungen.
3. Browser-E2E `check-built-save-transfer.mjs`: Start-Save18, alter
   Save17-Import ohne Stadtlayout, neue Save18-Persistierung nach Reload,
   Import-Rückgängig mit identischen IDs.
4. Web/Android CI inklusive nativer Android-APKs; GitHub-Pages-Deploy nur
   nach erfolgreichem Prüfergebnis.
5. Manueller Test: Alte Web-Saves exportieren, nach v0.7.0.0 laden; unveränderte
   Kader, Waffen, Forge-/Marktplätze, Teams und bisherige Stadtzugänge prüfen.
   Das neue Stadtlayout lässt sich im JSON-Export als `state.cityLayout` sehen.

## Rückfall
Vorheriger SHA: `bd006b139474e356260567ae71da84e795d8fe12`.
Weil Save18 neue Gebäudedaten enthält, ein Backup des neuen Spielstands
und des alten Save17-Exports vor einem Rückfall sichern. Keine
stillschweigende Herabstufung von Save18 zurück auf Save17.
