import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { getClassEquipmentRule, getWeaponClassRestriction, getKnownWeaponHandCount, getCharacterWeaponDamageFactor, checkProjectedEquipment, sanitizeEquipmentLoadouts, cloneStarterWeaponForEquipment } from '../src/app/game/equipment-rules-core.ts';
import { equipWeapon, getWeaponPickerPresentation, getWeaponInventoryPresentation } from '../src/app/game/equipment-core.ts';
import { calculateCharacterStats, calculateWeaponStats, createStatModifiers } from '../src/app/game/game-core.ts';
import { readAllTables } from './data/read-tabular-data.mjs';
import { validateGameData } from './data/validate-game-data.mjs';

const allowed = {
  recruit: ['dagger', 'sword', 'sword2h', 'axe1h', 'axe2h', 'staff'],
  fighter: ['sword', 'sword2h', 'axe1h', 'axe2h'],
  archer: ['dagger', 'sword', 'axe1h', 'bow'],
  scholar: ['dagger', 'staff']
};
const forms = ['dagger','sword','sword2h','axe1h','axe2h','bow','staff'];
const inventory = forms.map((weaponForm, i) => ({ id: i + 10, weaponForm, name: weaponForm, stats: calculateWeaponStats([], weaponForm) }));
const weapon = form => inventory.find(w => w.weaponForm === form);
const handCount = id => getKnownWeaponHandCount(inventory.find(w => w.id === id)?.weaponForm) ?? 1;
const policy = (character, id, slots) => checkProjectedEquipment(character, id, slots, inventory);
const character = (classId, leftHand = null, rightHand = null, id = 1) => ({ id, classId, name: classId, level: 1, hp: 10, maxHp: 30, energy: 30, maxEnergy: 100, alive: true, equipment: { leftHand, rightHand } });
let combinations = 0;
for (const classId of Object.keys(allowed)) for (const form of forms) {
  const c = character(classId), id = weapon(form).id, before = JSON.stringify(c);
  const expected = allowed[classId].includes(form);
  assert.equal(getWeaponClassRestriction(classId, form) === null, expected);
  const picker = getWeaponPickerPresentation([c], id, c.id, 'leftHand', handCount, policy);
  assert.equal(picker.disabled, !expected);
  const targets = getWeaponInventoryPresentation([c], id, handCount, policy).targets;
  assert.equal(targets.length > 0, expected);
  const result = equipWeapon([c], id, 'leftHand', c.id, handCount, policy);
  assert.equal(result.ok, expected);
  if (!expected) assert.equal(JSON.stringify(c), before, 'Rejected action must be atomic.');
  combinations++;
}
for (const classId of Object.keys(allowed)) {
  const c = character(classId, weapon('dagger').id, weapon('sword').id);
  const actual = getCharacterWeaponDamageFactor(classId, [weapon('dagger'), weapon('sword')]);
  assert.equal(actual, classId === 'recruit' ? .75 * 1.10 : 0);
}
assert.equal(getCharacterWeaponDamageFactor('recruit', [weapon('sword'), { ...weapon('sword'), id: 99 }]), .75);
assert.equal(getCharacterWeaponDamageFactor('recruit', [weapon('sword')]), 1);
assert.equal(getCharacterWeaponDamageFactor('fighter', [weapon('axe2h'), weapon('axe2h')]), 1.10);
assert.equal(getCharacterWeaponDamageFactor('archer', [weapon('bow')]), 1.10);
assert.equal(getCharacterWeaponDamageFactor('scholar', [weapon('staff')]), 1.10);
assert.equal(getCharacterWeaponDamageFactor('recruit', [weapon('staff')]), 1);
assert.equal(getWeaponClassRestriction('recruit', 'toString'), 'unknown-weapon-form');
assert.equal(getWeaponClassRestriction('unknown', 'sword'), 'unknown-class');
assert.equal(getClassEquipmentRule('fighter').weaponAndShieldAllowed, true);
assert.equal(getClassEquipmentRule('archer').weaponAndShieldAllowed, false);

const recruit = character('recruit', weapon('sword').id, weapon('dagger').id);
assert.equal(getCharacterWeaponDamageFactor('recruit', [weapon('sword'), weapon('dagger')]), .8250000000000001);
const occupied = character('fighter', weapon('sword').id);
const beforeOccupied = JSON.stringify(occupied);
assert.equal(equipWeapon([occupied], weapon('axe1h').id, 'rightHand', occupied.id, handCount, policy).reason, 'dual-wield-forbidden');
assert.equal(JSON.stringify(occupied), beforeOccupied);
assert.equal(equipWeapon([occupied], weapon('axe2h').id, 'rightHand', occupied.id, handCount, policy).ok, true);
assert.deepEqual(occupied.equipment, { leftHand: weapon('axe2h').id, rightHand: weapon('axe2h').id });
assert.equal(equipWeapon([occupied], weapon('sword').id, 'leftHand', occupied.id, handCount, policy).ok, true);
assert.deepEqual(occupied.equipment, { leftHand: weapon('sword').id, rightHand: null });

const originalInventory = JSON.stringify(inventory);
const originalObjects = [...inventory];
const repairCases = [
  character('fighter', weapon('dagger').id, weapon('sword').id, 1),
  character('fighter', weapon('axe1h').id, weapon('sword').id, 2),
  character('scholar', weapon('bow').id, weapon('bow').id, 3),
  character('recruit', weapon('staff').id, null, 4)
];
// Distinct item IDs for different owners; shared ownership has its own test below.
repairCases[0].equipment.rightHand = null;
const repairs = sanitizeEquipmentLoadouts(repairCases, inventory);
assert.ok(repairs.length >= 4);
assert.deepEqual(repairCases[0].equipment, { leftHand: null, rightHand: null });
assert.deepEqual(repairCases[1].equipment, { leftHand: null, rightHand: null });
assert.deepEqual(repairCases[2].equipment, { leftHand: null, rightHand: null });
assert.deepEqual(repairCases[3].equipment, { leftHand: weapon('staff').id, rightHand: weapon('staff').id });
assert.equal(repairs.filter(r => r.characterId === 3).length, 1, 'Two-hand item is reported once.');
assert.equal(JSON.stringify(inventory), originalInventory);
inventory.forEach((w, i) => assert.equal(w, originalObjects[i]));
assert.deepEqual(sanitizeEquipmentLoadouts(JSON.parse(JSON.stringify(repairCases)), inventory), []);
const mixed = character('fighter', weapon('dagger').id, weapon('sword').id);
sanitizeEquipmentLoadouts([mixed], inventory);
assert.deepEqual(mixed.equipment, { leftHand: null, rightHand: weapon('sword').id });
const duplicate = [character('recruit', weapon('sword').id, null, 1), character('fighter', weapon('sword').id, null, 2)];
sanitizeEquipmentLoadouts(duplicate, inventory);
assert.equal(duplicate[0].equipment.leftHand, weapon('sword').id);
assert.equal(duplicate[1].equipment.leftHand, null);
const legacyStarter = { id: 0, starter: true, weaponForm: 'starter', name: 'Starter', slots: [{ materialId: 1 }] };
const canonicalStarter = cloneStarterWeaponForEquipment(legacyStarter);
assert.equal(canonicalStarter.weaponForm, 'sword');
assert.equal(legacyStarter.weaponForm, 'starter');
assert.notEqual(canonicalStarter.slots, legacyStarter.slots);
assert.throws(() => cloneStarterWeaponForEquipment({ ...legacyStarter, id: 4 }));

const tables = await readAllTables();
const invalidTable = structuredClone(tables);
invalidTable.class_equipment_rules.rows[0].allowed_weapon_forms += '|missing';
assert.throws(() => validateGameData(invalidTable), /Unbekannte Waffenfreigabe/);

const temporary = [];
async function loadService(filename, exportName) {
  const url = new URL('../src/app/core/' + filename, import.meta.url);
  let source = readFileSync(url, 'utf8').replace(/\r\n/g, '\n')
    .replace("import { Injectable } from '@angular/core';\n", '')
    .replace("@Injectable({ providedIn: 'root' })\n", '')
    .replace("import { GameStateService, type MutableGameState } from './game-state.service';", "import type { GameStateService, MutableGameState } from './game-state.service';")
    .replace(/from '(\.\.\/game\/[^']+?)(?:\.ts)?';/g, (_m, p) => `from '${p}.ts';`)
    .replace('constructor(private readonly gameState: GameStateService) {}', 'private readonly gameState: GameStateService; constructor(gameState: GameStateService) { this.gameState = gameState; }');
  if (filename === 'game-dungeon.service.ts') {
    const coreUrl = new URL('../src/app/game/dungeon-core.ts', import.meta.url);
    const coreTemp = new URL('../src/app/game/dungeon-core.equipment-check.ts', import.meta.url);
    const coreSource = readFileSync(coreUrl, 'utf8').replace(/from '(\.\/[^']+?)(?:\.ts)?';/g, (_m, p) => `from '${p}.ts';`);
    writeFileSync(coreTemp, coreSource); temporary.push(coreTemp);
    source = source.replace("from '../game/dungeon-core.ts';", "from '../game/dungeon-core.equipment-check.ts';");
  }
  const temp = new URL(filename.replace('.ts', '.equipment-check.ts'), new URL('../src/app/core/', import.meta.url));
  writeFileSync(temp, source); temporary.push(temp);
  return (await import(temp.href + '?equipment=' + Date.now()))[exportName];
}
try {
  const GameEquipmentService = await loadService('game-equipment.service.ts', 'GameEquipmentService');
  const invalidWeapon = { id: 50, weaponForm: 'bow', name: 'Bogen', stats: { characterModifiers: createStatModifiers({ hp: 50, energy: 40 }) } };
  const c = character('recruit', 50, 50); c.hp = 70; c.maxHp = 80; c.energy = 130; c.maxEnergy = 140;
  const state = { characters: [c], weaponInventory: [invalidWeapon] };
  const service = new GameEquipmentService({ getState: () => state });
  assert.equal(service.normalizeEquipment().length, 1);
  assert.equal(c.hp, 30); assert.equal(c.energy, 100);
  assert.equal(state.weaponInventory[0], invalidWeapon);
  c.hp = 3; c.energy = 4;
  assert.deepEqual(service.normalizeEquipment(), []);
  assert.equal(c.hp, 3); assert.equal(c.energy, 4);

  const GameDungeonService = await loadService('game-dungeon.service.ts', 'GameDungeonService');
  for (const [classId, loadout, factor] of [['recruit',['sword','dagger'],.75*1.1],['fighter',['axe2h'],1.1],['archer',['bow'],1.1],['scholar',['staff'],1.1]]) {
    const weapons = loadout.map((f,i) => ({ ...weapon(f), id: i + 100 }));
    const c = character(classId, weapons[0].id, weapons[1]?.id ?? (handCount(weapon(loadout[0]).id) === 2 ? weapons[0].id : null));
    const state = { characters: [c], weaponInventory: weapons };
    const service = new GameDungeonService({ getState: () => state });
    const stats = calculateCharacterStats(classId, weapons);
    for (const crit of [false,true]) {
      const target = { id: 'e1', name: 'Ziel', hp: 10000, maxHp: 10000, alive: true, armor: 40, dodge: 0, threat: 50 };
      const rng = Math.random; const values = [0,0,.999,crit ? 0 : .999]; let i = 0;
      Math.random = () => values[i++];
      try { service.playerAttack(state, { ownerId: 1, kind: 'weapon', weaponId: weapons[0].id }, { enemies: [target] }, { events: [], saveRequested: false }); }
      finally { Math.random = rng; }
      const expected = weapons[0].stats.weaponBaseDamage * stats.strengthFactor * factor * (crit ? stats.critDamage : 1) * (1 - .4 * (1 - stats.penetration));
      assert.ok(Math.abs(10000 - target.hp - expected) < 1e-9, 'Real normal/critical combat must use the contextual factor exactly once.');
    }
  }
} finally { for (const file of temporary) unlinkSync(file); }
console.log(`Ausrüstungsregeln: ${combinations} Klassen/Waffen-Paare, atomare Handwechsel, 75 %/Präferenzen, identitätserhaltende Ladebereinigung, echte Schadensauflösung und Startwaffengrenze geprüft.`);
