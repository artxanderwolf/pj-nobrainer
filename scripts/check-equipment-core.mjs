import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nobrainer-equipment-'));
const sourcePath = path.resolve('src/app/game/equipment-core.ts');
const tempPath = path.join(tempDir, 'equipment-core.ts');
fs.copyFileSync(sourcePath, tempPath);

const { equipWeapon, getFreeWeaponEquipTargets, getWeaponEquipLocation, getWeaponInventoryPresentation, getWeaponPickerPresentation, unequipHand } = await import(pathToFileURL(tempPath).href);
const handCounts = new Map([[20, 2], [21, 2]]);
const resolveHandCount = weaponId => handCounts.get(weaponId) ?? 1;

const characters = [
  { id: 1, name: 'Rekrut 01', equipment: { leftHand: null, rightHand: 0 } },
  { id: 2, name: 'Rekrut 02', equipment: { leftHand: 9, rightHand: null } },
  { id: 3, name: 'Rekrut 03', equipment: { leftHand: null, rightHand: null } }
];

assert.deepEqual(getWeaponEquipLocation(characters, 0), { characterId: 1, hand: 'rightHand' });
assert.equal(getWeaponEquipLocation(characters, 7), null);
assert.deepEqual(getFreeWeaponEquipTargets(characters), [
  { characterId: 1, hand: 'leftHand', label: 'Linke Hand' },
  { characterId: 2, hand: 'rightHand', label: 'Rechte Hand' },
  { characterId: 3, hand: 'leftHand', label: 'Linke Hand' },
  { characterId: 3, hand: 'rightHand', label: 'Rechte Hand' }
]);
assert.deepEqual(getFreeWeaponEquipTargets(characters, 20, resolveHandCount), [
  { characterId: 3, hand: 'leftHand', label: 'Beide Hände' }
]);
assert.deepEqual(getWeaponInventoryPresentation(characters, 0, resolveHandCount), {
  location: { characterId: 1, hand: 'rightHand' },
  status: 'Rekrut 01 · RECHTE HAND',
  targets: []
});

assert.deepEqual(getWeaponPickerPresentation(characters, 0, 1, 'rightHand', resolveHandCount), { status: 'AUSGERÜSTET', disabled: true });
assert.deepEqual(getWeaponPickerPresentation(characters, 0, 1, 'leftHand', resolveHandCount), { status: 'ANDERE HAND', disabled: true });
assert.deepEqual(getWeaponPickerPresentation(characters, 9, 1, 'leftHand', resolveHandCount), { status: 'BELEGT: Rekrut 02', disabled: true });
assert.deepEqual(getWeaponPickerPresentation(characters, 20, 1, 'leftHand', resolveHandCount), { status: 'BEIDE HÄNDE BENÖTIGT', disabled: true });
assert.deepEqual(getWeaponPickerPresentation(characters, 20, 3, 'leftHand', resolveHandCount), { status: '', disabled: false });

const twoHanded = equipWeapon(characters, 20, 'leftHand', 3, resolveHandCount);
assert.deepEqual(twoHanded, { ok: true, location: { characterId: 3, hand: 'leftHand' } });
assert.deepEqual(characters[2].equipment, { leftHand: 20, rightHand: 20 });
assert.deepEqual(getWeaponInventoryPresentation(characters, 20, resolveHandCount), {
  location: { characterId: 3, hand: 'leftHand' },
  status: 'Rekrut 03 · BEIDE HÄNDE',
  targets: []
});
assert.deepEqual(getWeaponPickerPresentation(characters, 20, 3, 'rightHand', resolveHandCount), { status: 'AUSGERÜSTET (2H)', disabled: true });
assert.deepEqual(getWeaponPickerPresentation(characters, 21, 3, 'leftHand', resolveHandCount), { status: '', disabled: false }, 'Eine andere 2H-Waffe muss die bestehende 2H-Waffe direkt ersetzen dürfen.');
assert.ok(getFreeWeaponEquipTargets(characters, 21, resolveHandCount).some(target => target.characterId === 3 && target.label === 'Beide Hände'), 'Das Waffenlager muss einen direkten 2H-gegen-2H-Wechsel anbieten.');
assert.deepEqual(equipWeapon(characters, 21, 'rightHand', 3, resolveHandCount), { ok: true, location: { characterId: 3, hand: 'leftHand' } });
assert.deepEqual(characters[2].equipment, { leftHand: 21, rightHand: 21 }, '2H-gegen-2H muss beide Hände atomar auf die neue Waffe umstellen.');
assert.equal(unequipHand(characters, 3, 'rightHand'), true);
assert.deepEqual(characters[2].equipment, { leftHand: null, rightHand: null }, 'Ablegen einer 2H-Waffe muss beide Hände leeren.');

assert.deepEqual(equipWeapon(characters, 21, 'leftHand', 1, resolveHandCount), { ok: false, reason: 'both-hands-required' });

assert.deepEqual(equipWeapon(characters, 7, 'leftHand', 1, resolveHandCount), {
  ok: true,
  location: { characterId: 1, hand: 'leftHand' }
});
assert.equal(characters[0].equipment.leftHand, 7);
assert.equal(equipWeapon(characters, 7, 'rightHand', 1, resolveHandCount).ok, true);
assert.equal(characters[0].equipment.leftHand, null);
assert.equal(characters[0].equipment.rightHand, 7);

const occupied = equipWeapon(characters, 7, 'rightHand', 2, resolveHandCount);
assert.deepEqual(occupied, { ok: false, reason: 'weapon-in-use' });
assert.equal(characters[1].equipment.rightHand, null);
assert.equal(characters[0].equipment.rightHand, 7);

assert.deepEqual(equipWeapon(characters, 8, 'belt', 1, resolveHandCount), { ok: false, reason: 'invalid-hand' });
assert.deepEqual(equipWeapon(characters, 8, 'leftHand', 99, resolveHandCount), { ok: false, reason: 'character-not-found' });

assert.equal(unequipHand(characters, 1, 'rightHand'), true);
assert.equal(characters[0].equipment.rightHand, null);
assert.equal(unequipHand(characters, 99, 'leftHand'), false);
assert.equal(unequipHand(characters, 1, 'belt'), false);

console.log('Equipment-Core: 1H-/2H-Belegung, direkte 2H-Wechsel, freie Ziele, Handwechsel, Mehrfachschutz und gemeinsames Ablegen sind konsistent.');
