import assert from 'node:assert/strict';
import {
  CONFIG,
  MATERIALS,
  calculateWeaponStats,
  getWeaponCraftingSlots,
  getWeaponSelectionQuantity,
  isWeaponSelectionComplete,
  normalizeWeaponSlots,
  rarityFactor,
  reinforcementEffectText,
  weaponDamageAfterArmor
} from '../src/app/game/game-core.ts';

const materialNames = Object.keys(MATERIALS).sort();
assert.deepEqual(materialNames, [
  'Aluminium', 'Fichte', 'Fuchs-Leder', 'Hasen-Leder', 'Kupfer', 'Lederfetzen', 'Morsche Fichte', 'Tanne', 'Zinn'
].sort(), 'Die Blueprint-Umstellung darf keine Materialien hinzufügen oder entfernen.');

assert.deepEqual(
  { name: CONFIG.forge.weaponForms.dagger.name, baseDamage: CONFIG.forge.weaponForms.dagger.baseDamage, baseSpeed: CONFIG.forge.weaponForms.dagger.baseSpeed },
  { name: 'Dolch', baseDamage: 6, baseSpeed: 1.4 }
);
assert.deepEqual(
  { name: CONFIG.forge.weaponForms.sword.name, baseDamage: CONFIG.forge.weaponForms.sword.baseDamage, baseSpeed: CONFIG.forge.weaponForms.sword.baseSpeed },
  { name: 'Einhänder', baseDamage: 10, baseSpeed: 1.0 }
);
assert.deepEqual(getWeaponCraftingSlots('dagger'), ['workingPart', 'back', 'gripCore', 'gripWrap', 'special']);
assert.deepEqual(getWeaponCraftingSlots('sword'), ['workingPart', 'back', 'gripCore', 'gripWrap', 'special']);

const quantities = form => Object.fromEntries(getWeaponCraftingSlots(form).map(slot => [slot, getWeaponSelectionQuantity(form, slot)]));
assert.deepEqual(quantities('dagger'), { workingPart: 1, back: 1, gripCore: 1, gripWrap: 1, special: 1 });
assert.deepEqual(quantities('sword'), { workingPart: 3, back: 2, gripCore: 2, gripWrap: 1, special: 1 });
assert.equal(Object.values(quantities('dagger')).reduce((a, b) => a + b, 0), 5);
assert.equal(Object.values(quantities('sword')).reduce((a, b) => a + b, 0), 9);
assert.equal(CONFIG.forge.weaponForms.dagger.parts.some(part => part.id === 'parry'), false, 'Dolch darf keine Parierstange besitzen.');
assert.equal(CONFIG.forge.weaponForms.sword.parts.find(part => part.id === 'parry')?.materialSlot, 'back', 'Parierstange muss dasselbe Material wie der Rücken verwenden.');

const slots = [
  { slot: 'workingPart', material: 'Kupfer' },
  { slot: 'back', material: 'Zinn' },
  { slot: 'gripCore', material: 'Fichte' },
  { slot: 'gripWrap', material: 'Hasen-Leder' },
  { slot: 'special', material: 'Kupfer' }
];
assert.equal(isWeaponSelectionComplete(slots, 'dagger'), true);
assert.equal(isWeaponSelectionComplete(slots.slice(0, 4), 'dagger'), false);

const dagger = calculateWeaponStats(slots, 'dagger');
assert.equal(dagger.damagePerHit, 7.2);
assert.ok(Math.abs(dagger.attackSpeed - 1.68) < 1e-12);
assert.equal(dagger.hitChance, 0.55);
assert.equal(dagger.penetration, 0.20);
assert.ok(Math.abs(dagger.expectedRaw - 6.6528) < 1e-12);

const sword = calculateWeaponStats(slots, 'sword');
assert.equal(sword.damagePerHit, 12);
assert.equal(sword.attackSpeed, 1.2);
assert.equal(sword.hitChance, 0.55);
assert.equal(sword.penetration, 0.20);
assert.ok(Math.abs(sword.expectedRaw - 7.92) < 1e-12);

const legacySlots = [
  { slot: 'Waffentyp', material: 'Aluminium' },
  { slot: 'Schneide', material: 'Kupfer' },
  { slot: 'Rückseite', material: 'Zinn' },
  { slot: 'Griffform', material: 'Fichte' },
  { slot: 'Griffmaterial', material: 'Hasen-Leder' },
  { slot: 'Verstärkungsmaterial', material: 'Kupfer' }
];
assert.deepEqual(
  normalizeWeaponSlots(legacySlots).map(entry => entry.slot),
  ['baseMaterial', 'workingPart', 'back', 'gripCore', 'gripWrap', 'special'],
  'Alte Slotnamen müssen auf die neue Bauteilsemantik normalisiert werden.'
);
assert.equal(rarityFactor(legacySlots), 1, 'Das alte Grundmaterial darf die neue Waffenseltenheit nicht bestimmen.');
assert.deepEqual(calculateWeaponStats(legacySlots, 'sword'), sword, 'Das alte Grundmaterial darf die neuen Waffenwerte nicht beeinflussen.');

assert.equal(reinforcementEffectText('Kupfer'), '+10 Prozentpunkte DS');
assert.equal(reinforcementEffectText('Fichte'), 'Kein Zusatzeffekt');

const armored = weaponDamageAfterArmor({ stats: sword }, 100, { strengthFactor: 1, precision: 1 });
assert.ok(Math.abs(armored.raw - sword.expectedRaw) < 1e-12);
assert.equal(armored.penetration, 0.20);
assert.equal(armored.effectiveArmor, 80);
assert.ok(armored.afterArmor > 0 && armored.afterArmor < armored.raw);

console.log('Game-Core: Waffenbaupläne, Materialeigenschaften, Alt-Slot-Normalisierung und Kampfübergabe sind konsistent.');
