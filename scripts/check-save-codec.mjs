import assert from 'node:assert/strict';
import { decodeSave, encodeSave, SAVE_VERSION } from '../src/app/game/save-codec.ts';

const state = {
  gold: 123,
  characters: [{ id: 1, hp: 17, energy: 42 }],
  inventory: { Zinn: { materialId: 4, category: 'Metall', qty: 4 } },
  dungeonWavesDefeated: 9
};
const savedAt = 1_760_000_000_000;
const encoded = encodeSave(state, savedAt);
const parsed = JSON.parse(encoded);

assert.equal(parsed.saveVersion, 10, 'Save-Version muss für stabile Material-IDs im Lager 10 sein.');
assert.equal(SAVE_VERSION, 10, 'TypeScript-Save-Version muss 10 sein.');
assert.equal(parsed.savedAt, savedAt, 'savedAt muss unverändert gespeichert werden.');
assert.deepEqual(parsed.state, state, 'State muss unverändert im Save-Envelope liegen.');
assert.deepEqual(decodeSave(encoded), { state, savedAt, saveVersion: 10 }, 'Aktuelles Save-Envelope muss verlustfrei decodiert werden.');
assert.deepEqual(decodeSave(JSON.stringify(state)), { state, savedAt: null, saveVersion: null }, 'Legacy-Rohzustand muss weiterhin geladen werden.');

const legacyV9 = JSON.stringify({ saveVersion: 9, savedAt, state });
assert.deepEqual(decodeSave(legacyV9), { state, savedAt, saveVersion: 9 }, 'v9-Saves müssen weiterhin verlustfrei decodiert werden.');
const legacyV8 = JSON.stringify({ saveVersion: 8, savedAt, state });
assert.deepEqual(decodeSave(legacyV8), { state, savedAt, saveVersion: 8 }, 'v8-Saves müssen weiterhin verlustfrei decodiert werden.');

console.log('Save-Codec v10 ist rückwärtskompatibel zu den bisherigen Save-Envelopes v9 und v8.');
