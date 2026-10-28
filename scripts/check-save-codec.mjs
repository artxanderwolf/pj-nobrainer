import assert from 'node:assert/strict';
import { decodeSave, encodeSave, SAVE_VERSION } from '../src/app/game/save-codec.ts';
import {
  buildSaveExportFilename,
  MIN_IMPORT_SAVE_VERSION,
  validateImportedSave
} from '../src/app/game/save-transfer-core.ts';

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

assert.equal(parsed.saveVersion, 15, 'Save-Version muss für persistente Dungeon-Sitzungsendzeiten 15 sein.');
assert.equal(SAVE_VERSION, 15, 'TypeScript-Save-Version muss 15 sein.');
assert.equal(parsed.savedAt, savedAt, 'savedAt muss unverändert gespeichert werden.');
assert.equal(parsed.state.dungeonSessionEndsAt, state.dungeonSessionEndsAt, 'Die absolute Dungeon-Endzeit muss im Save erhalten bleiben.');
assert.deepEqual(parsed.state, state, 'State muss unverändert im Save-Envelope liegen.');
assert.deepEqual(decodeSave(encoded), { state, savedAt, saveVersion: 15 }, 'Aktuelles Save-Envelope muss verlustfrei decodiert werden.');
assert.deepEqual(decodeSave(JSON.stringify(state)), { state, savedAt: null, saveVersion: null }, 'Legacy-Rohzustand muss weiterhin geladen werden.');

for (const version of [14, 13, 12, 11, 10, 9, 8]) {
  const legacy = JSON.stringify({ saveVersion: version, savedAt, state });
  assert.deepEqual(decodeSave(legacy), { state, savedAt, saveVersion: version }, `v${version}-Saves müssen weiterhin verlustfrei decodiert werden.`);
  assert.equal(validateImportedSave(legacy).ok, true, `v${version}-Save-Dateien müssen für den JSON-Import akzeptiert werden.`);
}

const currentImport = validateImportedSave(encoded);
assert.equal(currentImport.ok, true, 'Aktuelles Save v15 muss als JSON-Datei importierbar sein.');
if (currentImport.ok) {
  assert.equal(currentImport.saveVersion, 15);
  assert.equal(currentImport.savedAt, savedAt);
  assert.deepEqual(currentImport.state, state);
}

assert.deepEqual(
  validateImportedSave('{kaputt'),
  { ok: false, reason: 'invalid-json', message: 'Die Datei enthält kein gültiges JSON.' },
  'Kaputtes JSON darf den Import nicht erreichen.'
);
assert.equal(validateImportedSave(JSON.stringify(state)).ok, false, 'Ein Legacy-Rohzustand ohne Save-Envelope darf nicht als Importdatei akzeptiert werden.');
assert.equal(
  validateImportedSave(JSON.stringify({ saveVersion: SAVE_VERSION + 1, savedAt, state })).reason,
  'future-version',
  'Save-Dateien aus einer neueren Version müssen blockiert werden.'
);
assert.equal(
  validateImportedSave(JSON.stringify({ saveVersion: MIN_IMPORT_SAVE_VERSION - 1, savedAt, state })).reason,
  'unsupported-version',
  'Nicht mehr unterstützte alte Save-Dateien müssen blockiert werden.'
);
assert.equal(
  validateImportedSave(JSON.stringify({ saveVersion: SAVE_VERSION, savedAt, state: { characters: [] } })).reason,
  'invalid-state',
  'Ein strukturell unvollständiger Spielzustand muss blockiert werden.'
);

const localDate = new Date(2026, 9, 24, 15, 36, 5).getTime();
assert.equal(
  buildSaveExportFilename('0.17.2', localDate),
  'NoBrainer-Spielstand-v0.17.2-2026-10-24_15-36-05.json',
  'Der Exportdateiname muss App-Version und lokalen Speicherzeitpunkt enthalten.'
);

console.log('Save-Codec v15 bleibt unverändert; JSON-Export/Import validiert Save-Dateien v8 bis v15 und blockiert ungültige oder zukünftige Saves.');
