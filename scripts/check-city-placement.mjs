import assert from 'node:assert/strict';
import { createInitialCityLayout, validateCityLayout, CITY_BUILDING_TYPES } from '../src/app/game/city-layout-core.ts';
import {
  CITY_EXPANSION_SIZE, moveCityBuilding, expandCityLayout, placeCityBuilding
} from '../src/app/game/city-placement-core.ts';
import { encodeSave, decodeSave, SAVE_VERSION } from '../src/app/game/save-codec.ts';

const layout = createInitialCityLayout();
const snapshot = JSON.stringify(layout);
assert.equal(CITY_EXPANSION_SIZE, 4);

const valid = moveCityBuilding(layout, 'building-3', 8, 2);
assert.equal(valid.ok, true);
assert.equal(JSON.stringify(layout), snapshot, 'S09 darf den ursprünglichen State niemals direkt mutieren.');
assert.deepEqual(valid.layout.buildings.map(b => b.buildingInstanceId),
  layout.buildings.map(b => b.buildingInstanceId));
assert.equal(valid.layout.buildings.find(b => b.buildingInstanceId === 'building-3').x, 8);
assert.equal(valid.layout.buildings.find(b => b.buildingInstanceId === 'building-3').y, 2);
assert.equal(valid.layout.nextBuildingNumber, layout.nextBuildingNumber);
validateCityLayout(valid.layout);

for (const [reason, id, x, y] of [
  ['collision', 'building-3', 4, 0],
  ['out-of-bounds', 'building-3', 11, 0],
  ['invalid-position', 'building-3', 1.1, 0],
  ['unknown-building', 'building-999', 6, 1],
  ['unchanged', 'building-3', 8, 0]
]) {
  const before = JSON.stringify(layout);
  const failed = moveCityBuilding(layout, id, x, y);
  assert.equal(failed.ok, false, reason);
  assert.equal(failed.reason, reason);
  assert.equal(JSON.stringify(layout), before, 'Ungültiger Move darf keinen State verändern: ' + reason);
}

const withJobs = structuredClone(layout);
withJobs.buildings[2].workerCharacterId = 123;
withJobs.buildings[2].activeJobId = 'forge-job-789';
withJobs.buildings[2].unitSlots = 4;
withJobs.buildings[2].status = 'underConstruction';
const moved = moveCityBuilding(withJobs, 'building-3', 8, 2);
assert.equal(moved.ok, true);
const movedForge = moved.layout.buildings[2];
assert.equal(movedForge.workerCharacterId, 123, 'Arbeiterzuordnung muss unverändert bleiben.');
assert.equal(movedForge.activeJobId, 'forge-job-789', 'Auftrags-ID muss unverändert bleiben.');
assert.equal(movedForge.unitSlots, 4);
assert.equal(movedForge.status, 'underConstruction');
assert.equal(movedForge.assetKey, CITY_BUILDING_TYPES.forge.assetKey);
assert.equal(JSON.stringify(withJobs), JSON.stringify({ ...withJobs }),
  'Quellzustand bleibt intakt');

const expected = [
  ['left', -4, 0, 16, 8],
  ['right', 0, 0, 16, 8],
  ['up', 0, -4, 12, 12],
  ['down', 0, 0, 12, 12]
];
for (const [direction, minX, minY, width, height] of expected) {
  const expanded = expandCityLayout(layout, direction);
  assert.deepEqual(expanded.grid, { minX, minY, width, height }, 'Richtung ' + direction);
  assert.equal(expanded.buildings.length, 6);
  assert.equal(expanded.nextBuildingNumber, 7);
  assert.deepEqual(expanded.buildings, layout.buildings,
    'Erweiterung darf Positionen/Arbeiter/Jobs/IDs nicht verändern.');
  validateCityLayout(expanded);
  assert.equal(JSON.stringify(layout), snapshot);
}

let expanded = layout;
for (const direction of ['left', 'right', 'up', 'down']) {
  expanded = expandCityLayout(expanded, direction);
}
assert.deepEqual(expanded.grid, { minX: -4, minY: -4, width: 20, height: 16 });

const laterPlacement = {
  buildingTypeId: 'forge', x: 10, y: 6, width: 2, height: 2,
  status: 'inactive', unitSlots: 1, teamId: null,
  workerCharacterId: null, activeJobId: null
};
const future = placeCityBuilding(layout, laterPlacement);
assert.equal(future.ok, true);
assert.equal(future.layout.buildings[6].buildingInstanceId, 'building-7');
assert.equal(future.layout.buildings[6].assetKey, CITY_BUILDING_TYPES.forge.assetKey);
assert.equal(future.layout.nextBuildingNumber, 8);
assert.equal(layout.buildings.length, 6, 'Keine kostenlose Neubau-Aktion auf dem S09-State.');
assert.equal(placeCityBuilding(layout, { ...laterPlacement, x: 8, y: 0 }).reason, 'collision');
assert.equal(placeCityBuilding(layout, { ...laterPlacement, x: 11, y: 7 }).reason, 'out-of-bounds');
assert.equal(placeCityBuilding(layout, { ...laterPlacement, buildingTypeId: 'invalid' }).reason, 'invalid-building');
assert.equal(placeCityBuilding(layout, { ...laterPlacement, buildingTypeId: 'team', teamId: 1 }).reason, 'invalid-building');

assert.equal(SAVE_VERSION, 23, 'S10 ergänzt persistente Kauf- und Migrationsdaten.');
const progress = { cityLayout: moved.layout, gold: 5800, upgrades: { forgeSlots: 5, marketSlots: 3 } };
const saved = encodeSave(progress, 1_760_000_000_000);
const restored = decodeSave(saved);
assert.deepEqual(restored.state, progress, 'Gebäudeposition und Auftragsbezüge müssen Save18 überstehen.');
const extended = encodeSave({ ...progress, cityLayout: expanded }, 1_760_000_000_000);
assert.deepEqual(decodeSave(extended).state.cityLayout.grid, expanded.grid);
console.log('S09: vier 4-Felder-Erweiterungen, 2x2-Kollision/Bounds, atomare Moves, stabile Gebäude-/Job-/Arbeiter-IDs, künftige autorisierte Platzierung und Save18 geprüft.');
