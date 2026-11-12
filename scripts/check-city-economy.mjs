import assert from 'node:assert/strict';
import { createInitialCityLayout, validateCityLayout } from '../src/app/game/city-layout-core.ts';
import {
  CITY_BUILDING_ECONOMY, cityBuildingPrice, cityExpansionPrice,
  migrateCityEconomy, buyCityExpansion
} from '../src/app/game/city-economy-core.ts';
import { encodeSave, decodeSave, SAVE_VERSION } from '../src/app/game/save-codec.ts';
import { validateImportedSave } from '../src/app/game/save-transfer-core.ts';
import { ECONOMY_BALANCE } from '../src/app/game/economy-core.ts';

assert.equal(ECONOMY_BALANCE.progressionCostMultiplier, 10);
for (const [type, base, max] of [
  ['forge', 5000, 10], ['market', 5000, 10],
  ['team', 3000, 10], ['builder', 20000, 2],
  ['tavern', 20000, 10], ['runeWorkshop', 20000, 2]
]) {
  assert.equal(CITY_BUILDING_ECONOMY[type].baseNickel, base);
  assert.equal(CITY_BUILDING_ECONOMY[type].max, max);
  assert.equal(cityBuildingPrice(type, 0), 0, 'Erstbau kostenlos: ' + type);
  assert.equal(cityBuildingPrice(type, 1), base * 10);
  if (max > 2) assert.equal(cityBuildingPrice(type, 2), Math.round(base * 10 * 1.2));
  assert.equal(cityBuildingPrice(type, max), null);
}
assert.equal(cityExpansionPrice(0), 30_000);
assert.equal(cityExpansionPrice(1), 45_000);
assert.equal(cityExpansionPrice(2), 67_500);
assert.throws(() => cityExpansionPrice(-1));

function makeState(forgeSlots, marketSlots, teamCount) {
  return {
    gold: 500_000,
    characters: [],
    inventory: {},
    cityLayout: createInitialCityLayout(),
    upgrades: { forgeSlots, marketSlots },
    teams: Object.fromEntries(Array.from({ length: teamCount }, (_, i) =>
      [i + 1, { teamId: i + 1, dungeonRun: { startedAt: 123 + i }, log: ['unverändert'] }])),
    forgeQueue: [{ id: 'job-1', dueAt: 12345 }],
    marketQueue: [{ id: 'sale-1', dueAt: 67890 }]
  };
}
for (const slots of [1, 3, 5]) {
  const state = makeState(slots, slots, 10);
  const before = structuredClone(state);
  assert.equal(migrateCityEconomy(state), true);
  assert.equal(state.cityLayout.buildings.filter(b => b.buildingTypeId === 'forge').length, slots);
  assert.equal(state.cityLayout.buildings.filter(b => b.buildingTypeId === 'market').length, slots);
  assert.equal(state.cityLayout.buildings.filter(b => b.buildingTypeId === 'team').length, 10);
  assert.deepEqual(state.cityLayout.buildings.filter(b => b.buildingTypeId === 'team')
    .map(b => b.teamId).sort((a,b)=>a-b), Array.from({ length: 10 }, (_,i)=>i+1));
  assert.equal(state.gold, before.gold, 'Keine doppelte Nickelabbuchung.');
  assert.deepEqual(state.teams, before.teams, 'Sessions müssen unverändert bleiben.');
  assert.deepEqual(state.forgeQueue, before.forgeQueue);
  assert.deepEqual(state.marketQueue, before.marketQueue);
  assert.equal(state.cityEconomy.paidExpansions, 0);
  validateCityLayout(state.cityLayout);
  const first = structuredClone(state);
  assert.equal(migrateCityEconomy(state), false, 'Idempotenz.');
  assert.deepEqual(state, first);
  const save = encodeSave(state);
  assert.equal(validateImportedSave(save).ok, true);
  const restored = decodeSave(save).state;
  assert.equal(migrateCityEconomy(restored), false);
  assert.deepEqual(restored, state);
}
const large = makeState(10, 10, 10);
migrateCityEconomy(large);
assert.ok(large.cityEconomy.freeMigrationExpansions > 0,
  'Wenn der Platz nicht reicht, muss kostenlos erweitert werden.');
assert.equal(large.cityEconomy.paidExpansions, 0);
const small = makeState(1, 1, 1);
migrateCityEconomy(small);
const lowSnapshot = JSON.stringify(small);
small.gold = 0;
const failure = buyCityExpansion(small, 'right');
assert.equal(failure.ok, false);
assert.equal(JSON.stringify(small), JSON.stringify({ ...JSON.parse(lowSnapshot), gold: 0 }));
small.gold = 100_000;
const oldGold = small.gold;
assert.equal(buyCityExpansion(small, 'left').ok, true);
assert.equal(small.gold, oldGold - 30_000);
assert.equal(small.cityEconomy.paidExpansions, 1);
assert.equal(buyCityExpansion(small, 'up').costNickel, 45_000);
assert.equal(small.cityEconomy.paidExpansions, 2);
assert.equal(SAVE_VERSION, 20);
console.log('S10: Nickelpreise, Grenzen, 1/3/5 Alt-Slots, 10 Teams, Gratis-Migrationsfläche, Idempotenz, Save19 und bezahlte Erweiterung geprüft.');
