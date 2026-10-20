import assert from 'node:assert/strict';
import { decodeSave, encodeSave, SAVE_VERSION } from '../src/app/game/save-codec.ts';

const state = {
  gold: 123,
  characters: [{ id: 1, hp: 17, energy: 42 }],
  inventory: { '4': { materialId: 4, category: 'Metall', qty: 4 } },
  dungeonLoot: { '2': { materialId: 2, category: 'Holz', qty: 1 } },
  weaponInventory: [{ id: 7, slots: [{ slot: 'workingPart', materialId: 4, material: 'Zinn' }] }],
  marketQueue: [{ type: 'material', materialId: 4, name: 'Zinn', quantity: 1 }],
  dungeonWavesDefeated: 9
};
const savedAt = 1_760_000_000_000;
const encoded = encodeSave(state, savedAt);
const parsed = JSON.parse(encoded);

assert.equal(parsed.saveVersion, 12, 'Save-Version muss für vollständig ID-keyed Materialbestände 12 sein.');
assert.equal(SAVE_VERSION, 12, 'TypeScript-Save-Version muss 12 sein.');
assert.equal(parsed.savedAt, savedAt, 'savedAt muss unverändert gespeichert werden.');
assert.deepEqual(parsed.state, state, 'State muss unverändert im Save-Envelope liegen.');
assert.deepEqual(decodeSave(encoded), { state, savedAt, saveVersion: 12 }, 'Aktuelles Save-Envelope muss verlustfrei decodiert werden.');
assert.deepEqual(decodeSave(JSON.stringify(state)), { state, savedAt: null, saveVersion: null }, 'Legacy-Rohzustand muss weiterhin geladen werden.');

for (const version of [11, 10, 9, 8]) {
  const legacy = JSON.stringify({ saveVersion: version, savedAt, state });
  assert.deepEqual(decodeSave(legacy), { state, savedAt, saveVersion: version }, `v${version}-Saves müssen weiterhin verlustfrei decodiert werden.`);
}

console.log('Save-Codec v12 ist rückwärtskompatibel zu den bisherigen Save-Envelopes v11, v10, v9 und v8.');
