import assert from 'node:assert/strict';
import { decodeSave, encodeSave, SAVE_VERSION } from '../src/app/game/save-codec.ts';

const state = {
  gold: 123,
  characters: [{ id: 1, hp: 17, energy: 42 }],
  inventory: { '4': { materialId: 4, category: 'Metall', qty: 4 } },
  dungeonLoot: { '2': { materialId: 2, category: 'Holz', qty: 1 } },
  weaponInventory: [{ id: 7, slots: [{ slot: 'workingPart', materialId: 4 }] }],
  marketQueue: [{ type: 'material', materialId: 4, quantity: 1 }],
  dungeonWavesDefeated: 9,
  dungeonSessionEndsAt: 1_760_018_000_000
};
const savedAt = 1_760_000_000_000;
const encoded = encodeSave(state, savedAt);
const parsed = JSON.parse(encoded);

assert.equal(parsed.saveVersion, 14, 'Save-Version muss für persistente Dungeon-Sitzungsendzeiten 14 sein.');
assert.equal(SAVE_VERSION, 14, 'TypeScript-Save-Version muss 14 sein.');
assert.equal(parsed.savedAt, savedAt, 'savedAt muss unverändert gespeichert werden.');
assert.equal(parsed.state.dungeonSessionEndsAt, state.dungeonSessionEndsAt, 'Die absolute Dungeon-Endzeit muss im Save erhalten bleiben.');
assert.deepEqual(parsed.state, state, 'State muss unverändert im Save-Envelope liegen.');
assert.deepEqual(decodeSave(encoded), { state, savedAt, saveVersion: 14 }, 'Aktuelles Save-Envelope muss verlustfrei decodiert werden.');
assert.deepEqual(decodeSave(JSON.stringify(state)), { state, savedAt: null, saveVersion: null }, 'Legacy-Rohzustand muss weiterhin geladen werden.');

for (const version of [13, 12, 11, 10, 9, 8]) {
  const legacy = JSON.stringify({ saveVersion: version, savedAt, state });
  assert.deepEqual(decodeSave(legacy), { state, savedAt, saveVersion: version }, `v${version}-Saves müssen weiterhin verlustfrei decodiert werden.`);
}

console.log('Save-Codec v14 persistiert die Dungeon-Sitzungsendzeit und bleibt rückwärtskompatibel zu den bisherigen Save-Envelopes v13 bis v8.');
