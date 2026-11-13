import assert from 'node:assert/strict';
import {
  CITY_BUILDING_TYPES,
  CITY_LAYOUT_SCHEMA_VERSION,
  DEFAULT_BUILDING_SIZE,
  INITIAL_CITY_WIDTH,
  INITIAL_CITY_HEIGHT,
  createInitialCityLayout,
  migrateCityLayout,
  validateCityLayout
} from '../src/app/game/city-layout-core.ts';
import { SAVE_VERSION, decodeSave, encodeSave } from '../src/app/game/save-codec.ts';
import { validateImportedSave } from '../src/app/game/save-transfer-core.ts';

const expectedTypes = ['roster', 'tavern', 'forge', 'market', 'team', 'builder'];
const city = createInitialCityLayout();
assert.equal(city.schemaVersion, CITY_LAYOUT_SCHEMA_VERSION);
assert.deepEqual(city.grid, { minX: 0, minY: 0, width: 12, height: 8 });
assert.equal(INITIAL_CITY_WIDTH, 12);
assert.equal(INITIAL_CITY_HEIGHT, 8);
assert.equal(DEFAULT_BUILDING_SIZE, 2);
assert.deepEqual(city.buildings.map(building => building.buildingTypeId), expectedTypes);
assert.equal(city.nextBuildingNumber, 7);
assert.equal(new Set(city.buildings.map(building => building.buildingInstanceId)).size, 6);
assert.equal(city.buildings.find(building => building.buildingTypeId === 'team')?.teamId, 1);
assert.ok(!city.buildings.some(building => building.buildingTypeId === 'runeWorkshop'),
  'Runenwerkstatt startet erst nach Freischaltung (S22).');
assert.equal(Object.keys(CITY_BUILDING_TYPES).length, 7);
validateCityLayout(city);
const usedCells = new Set();
for (const building of city.buildings) {
  assert.equal(building.width, 2);
  assert.equal(building.height, 2);
  assert.equal(building.unitSlots, 1);
  assert.equal(building.status, 'placed');
  assert.equal(building.workerCharacterId, null);
  assert.equal(building.activeJobId, null);
  assert.equal(building.assetKey, CITY_BUILDING_TYPES[building.buildingTypeId].assetKey);
  for (let x = building.x; x < building.x + building.width; x++) {
    for (let y = building.y; y < building.y + building.height; y++) {
      assert.ok(x >= 0 && x < 12 && y >= 0 && y < 8, 'Stadtgebäude außerhalb des 12x8-Rasters');
      const key = x + ':' + y;
      assert.ok(!usedCells.has(key), 'Startgebäude überlappt: ' + key);
      usedCells.add(key);
    }
  }
}
assert.equal(usedCells.size, 24, 'Sechs 2x2-Gebäude belegen genau 24 Startzellen.');
const another = createInitialCityLayout();
another.buildings[0].x = 1;
assert.equal(city.buildings[0].x, 0, 'Startstadt darf keine geteilten globalen Objekte enthalten.');

const oldState = {
  gold: 556677,
  characters: [{ id: 1, classId: 'healer', level: 12 }],
  inventory: { '4': { materialId: 4, qty: 44 } },
  weaponInventory: [{ id: 301, weaponForm: 'sword', slots: [{ slot: 'special', materialId: 4 }] }],
  teams: { '1': { teamId: 1, dungeonRun: { startedAt: 100, participantIds: [1] } },
           '2': { teamId: 2, dungeonRun: { startedAt: 200, participantIds: [] } } },
  forgeQueue: [{ materialId: 4, amount: 2 }],
  marketQueue: [{ materialId: 4, amount: 3 }],
  upgrades: { forgeSlots: 5, marketSlots: 3 },
  cityName: 'Meine Stadt'
};
const old = JSON.stringify({ saveVersion: 17, savedAt: 1_762_000_000_000, state: oldState });
assert.equal(validateImportedSave(old).ok, true, 'Save 17 muss importierbar bleiben.');
const loaded = decodeSave(old);
const untouchedSnapshot = JSON.stringify(loaded.state);
const oldFields = Object.keys(oldState).sort();
assert.equal(migrateCityLayout(loaded.state), true, 'Alter Save muss neue Stadt erhalten.');
assert.deepEqual(Object.keys(loaded.state).filter(key => key !== 'cityLayout').sort(), oldFields);
const unchangedFields = Object.fromEntries(Object.entries(loaded.state).filter(([key]) => key !== 'cityLayout'));
assert.equal(JSON.stringify(unchangedFields), untouchedSnapshot,
  'Charaktere, Heiler, Teams, Jobs, Waffen, Materialien und gekaufte Alt-Slots müssen identisch bleiben.');
assert.equal(loaded.state.cityLayout.buildings.length, 6);
const serialized = encodeSave(loaded.state, loaded.savedAt);
assert.equal(SAVE_VERSION, 23, 'S10 ergänzt persistente Stadtökonomie zu Save18.');
assert.equal(JSON.parse(serialized).saveVersion, 23);
assert.equal(validateImportedSave(serialized).ok, true);
const restored = decodeSave(serialized);
const restoredCity = structuredClone(restored.state.cityLayout);
assert.equal(migrateCityLayout(restored.state), false, 'Stadt darf beim Reload nicht erneut entstehen.');
assert.deepEqual(restored.state.cityLayout, restoredCity);
assert.equal(restored.state.teams['2'].dungeonRun.startedAt, 200);
assert.equal(restored.state.upgrades.forgeSlots, 5);
assert.equal(restored.state.upgrades.marketSlots, 3);

const invalidCopy = () => structuredClone(city);
for (const [label, change] of [
  ['doppelte IDs', l => l.buildings[1].buildingInstanceId = l.buildings[0].buildingInstanceId],
  ['Kollision', l => { l.buildings[1].x = l.buildings[0].x; l.buildings[1].y = l.buildings[0].y; }],
  ['außerhalb', l => { l.buildings[0].x = 12; }],
  ['ungültiger Typ', l => { l.buildings[0].buildingTypeId = 'Schmiede'; }],
  ['nächste ID rückwärts', l => { l.nextBuildingNumber = 2; }],
  ['ungültige Größe', l => { l.buildings[0].width = 0; }],
  ['doppelte Teams', l => { l.buildings[1].buildingTypeId = 'team'; l.buildings[1].teamId = 1; }]
]) {
  const layout = invalidCopy();
  change(layout);
  assert.throws(() => validateCityLayout(layout), /Ungültige Stadtdaten/, label + ' darf nicht akzeptiert werden.');
}
const invalidExistingState = { cityLayout: invalidCopy(), gold: 777 };
invalidExistingState.cityLayout.buildings[1].x = 0;
invalidExistingState.cityLayout.buildings[1].y = 0;
const snapshot = JSON.stringify(invalidExistingState);
assert.throws(() => migrateCityLayout(invalidExistingState), /Ungültige Stadtdaten/);
assert.equal(JSON.stringify(invalidExistingState), snapshot,
  'Beschädigte Stadtsaves dürfen nie stillschweigend überschrieben werden.');

// S09-Erweiterbarkeit vorprüfen, ohne bereits Verschieben/Bauen zu implementieren.
const expanded = invalidCopy();
expanded.grid.minX = -4;
expanded.grid.width = 16;
expanded.buildings[0].x = -2;
expanded.buildings.push({
  buildingInstanceId: 'building-7', buildingTypeId: 'runeWorkshop',
  x: 10, y: 5, width: 2, height: 2, status: 'inactive',
  unitSlots: 1, teamId: null, workerCharacterId: null, activeJobId: null,
  assetKey: CITY_BUILDING_TYPES.runeWorkshop.assetKey
});
expanded.nextBuildingNumber = 8;
validateCityLayout(expanded);
assert.deepEqual(expanded.buildings.slice(1, 6).map(x => x.buildingInstanceId),
  ['building-2','building-3','building-4','building-5','building-6']);
console.log('S07: Save17->18, sechs 2x2-Startgebäude, stabile IDs, Kollision/Bounds, Idempotenz, Alt-Slots/Teams/Heiler/Jobs und Stadt-Erweiterbarkeit geprüft.');
