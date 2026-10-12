import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nobrainer-equipment-'));
const sourcePath = path.resolve('src/app/game/equipment-core.ts');
const tempPath = path.join(tempDir, 'equipment-core.ts');
fs.copyFileSync(sourcePath, tempPath);

const { equipWeapon, getFreeWeaponEquipTargets, getWeaponEquipLocation, unequipHand } = await import(pathToFileURL(tempPath).href);

const characters = [
  { id: 1, equipment: { leftHand: null, rightHand: 0 } },
  { id: 2, equipment: { leftHand: null, rightHand: null } }
];

assert.deepEqual(getWeaponEquipLocation(characters, 0), { characterId: 1, hand: 'rightHand' });
assert.equal(getWeaponEquipLocation(characters, 7), null);
assert.deepEqual(getFreeWeaponEquipTargets(characters), [
  { characterId: 1, hand: 'leftHand', label: 'Linke Hand' },
  { characterId: 2, hand: 'leftHand', label: 'Linke Hand' },
  { characterId: 2, hand: 'rightHand', label: 'Rechte Hand' }
]);

assert.deepEqual(equipWeapon(characters, 7, 'leftHand', 1), {
  ok: true,
  location: { characterId: 1, hand: 'leftHand' }
});
assert.equal(characters[0].equipment.leftHand, 7);
assert.deepEqual(getFreeWeaponEquipTargets(characters), [
  { characterId: 2, hand: 'leftHand', label: 'Linke Hand' },
  { characterId: 2, hand: 'rightHand', label: 'Rechte Hand' }
]);

assert.equal(equipWeapon(characters, 7, 'rightHand', 1).ok, true);
assert.equal(characters[0].equipment.leftHand, null);
assert.equal(characters[0].equipment.rightHand, 7);

const occupied = equipWeapon(characters, 7, 'leftHand', 2);
assert.deepEqual(occupied, { ok: false, reason: 'weapon-in-use' });
assert.equal(characters[1].equipment.leftHand, null);
assert.equal(characters[0].equipment.rightHand, 7);

assert.deepEqual(equipWeapon(characters, 8, 'belt', 1), { ok: false, reason: 'invalid-hand' });
assert.deepEqual(equipWeapon(characters, 8, 'leftHand', 99), { ok: false, reason: 'character-not-found' });

assert.equal(unequipHand(characters, 1, 'rightHand'), true);
assert.equal(characters[0].equipment.rightHand, null);
assert.equal(unequipHand(characters, 99, 'leftHand'), false);
assert.equal(unequipHand(characters, 1, 'belt'), false);

console.log('Equipment-Core: Belegung, freie Inventarziele, Handwechsel, Mehrfachschutz und Ablegen sind konsistent.');
