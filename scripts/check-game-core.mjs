import assert from 'node:assert/strict';
import {
  CHARACTER_CLASSES,
  CONFIG,
  MATERIALS,
  calculateCharacterStats,
  calculateWeaponStats,
  getWeaponCraftingSlots,
  getWeaponSelectionQuantity,
  isWeaponSelectionComplete,
  normalizeWeaponSlots,
  rarityFactor,
  reinforcementEffectText,
  weaponDamageAfterArmor
} from '../src/app/game/game-core.ts';

const closeTo = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-12, message ?? `${actual} ≈ ${expected}`);

const materialNames = Object.keys(MATERIALS).sort();
assert.deepEqual(materialNames, [
  'Aluminium', 'Fichte', 'Fuchs-Leder', 'Hasen-Leder', 'Kupfer', 'Lederfetzen', 'Morsche Fichte', 'Tanne', 'Zinn'
].sort(), 'Die Stat-Umstellung darf keine Materialien hinzufügen oder entfernen.');

assert.deepEqual(
  { name: CONFIG.forge.weaponForms.dagger.name, baseDamage: CONFIG.forge.weaponForms.dagger.baseDamage, baseSpeed: CONFIG.forge.weaponForms.dagger.baseSpeed, baseHitChance: CONFIG.forge.weaponForms.dagger.baseHitChance },
  { name: 'Dolch', baseDamage: 6, baseSpeed: 1.4, baseHitChance: 0.60 }
);
assert.deepEqual(
  { name: CONFIG.forge.weaponForms.sword.name, baseDamage: CONFIG.forge.weaponForms.sword.baseDamage, baseSpeed: CONFIG.forge.weaponForms.sword.baseSpeed, baseHitChance: CONFIG.forge.weaponForms.sword.baseHitChance },
  { name: '1H Schwert', baseDamage: 10, baseSpeed: 1.0, baseHitChance: 0.55 }
);
assert.deepEqual(getWeaponCraftingSlots('dagger'), ['workingPart', 'back', 'gripCore', 'gripWrap', 'special']);
assert.deepEqual(getWeaponCraftingSlots('sword'), ['workingPart', 'back', 'gripCore', 'gripWrap', 'special', 'parry']);

const quantities = form => Object.fromEntries(getWeaponCraftingSlots(form).map(slot => [slot, getWeaponSelectionQuantity(form, slot)]));
assert.deepEqual(quantities('dagger'), { workingPart: 1, back: 1, gripCore: 1, gripWrap: 1, special: 1 });
assert.deepEqual(quantities('sword'), { workingPart: 2, back: 2, gripCore: 1, gripWrap: 1, special: 1, parry: 1 });
assert.equal(Object.values(quantities('dagger')).reduce((a, b) => a + b, 0), 5);
assert.equal(Object.values(quantities('sword')).reduce((a, b) => a + b, 0), 8);
assert.equal(CONFIG.forge.weaponForms.dagger.parts.some(part => part.id === 'parry'), false, 'Dolch darf keine Parierstange besitzen.');
assert.equal(CONFIG.forge.weaponForms.sword.parts.find(part => part.id === 'parry')?.materialSlot, 'parry', 'Parierstange muss eine eigene Materialauswahl besitzen.');

assert.equal(MATERIALS['Hasen-Leder'].rarity, 1, 'Hasen-Leder folgt der aktuellen Materialliste und ist S1.');
closeTo(MATERIALS.Tanne.stats.precision, 0.10);
closeTo(MATERIALS.Aluminium.stats.strengthFactor, 0.10);
closeTo(MATERIALS['Fuchs-Leder'].stats.critChance, 0.04);
assert.deepEqual(MATERIALS.Kupfer.specialEffect, { stat: 'DS', amount: 0.10 });
assert.deepEqual(MATERIALS['Morsche Fichte'].specialEffect, { stat: 'GES', amount: 0.05 });

const daggerSlots = [
  { slot: 'workingPart', material: 'Kupfer' },
  { slot: 'back', material: 'Zinn' },
  { slot: 'gripCore', material: 'Fichte' },
  { slot: 'gripWrap', material: 'Hasen-Leder' },
  { slot: 'special', material: 'Kupfer' }
];
assert.equal(isWeaponSelectionComplete(daggerSlots, 'dagger'), true);
assert.equal(isWeaponSelectionComplete(daggerSlots.slice(0, 4), 'dagger'), false);

const dagger = calculateWeaponStats(daggerSlots, 'dagger');
closeTo(dagger.characterModifiers.strengthFactor, 0.05);
closeTo(dagger.characterModifiers.precision, 0.10);
closeTo(dagger.characterModifiers.dodge, 0.02);
closeTo(dagger.characterModifiers.critChance, 0.05);
closeTo(dagger.characterModifiers.penetration, 0.10);
closeTo(dagger.damagePerHit, 6.3);
closeTo(dagger.attackSpeed, 1.4);
closeTo(dagger.hitChance, 0.66);
closeTo(dagger.penetration, 0.10);
closeTo(dagger.expectedRaw, 5.8212);

const swordSlots = [...daggerSlots, { slot: 'parry', material: 'Aluminium' }];
const sword = calculateWeaponStats(swordSlots, 'sword');
closeTo(sword.characterModifiers.armor, 4);
closeTo(sword.characterModifiers.dodge, 0.02);
closeTo(sword.characterModifiers.strengthFactor, 0.10);
closeTo(sword.characterModifiers.precision, 0.05);
closeTo(sword.characterModifiers.critChance, 0.02);
closeTo(sword.characterModifiers.critDamage, 0.10);
closeTo(sword.characterModifiers.penetration, 0.10);
closeTo(sword.damagePerHit, 11);
closeTo(sword.attackSpeed, 1);
closeTo(sword.hitChance, 0.5775);
closeTo(sword.penetration, 0.10);
closeTo(sword.expectedRaw, 6.3525);

const legacySlots = [
  { slot: 'Waffentyp', material: 'Aluminium' },
  { slot: 'Schneide', material: 'Kupfer' },
  { slot: 'Rückseite', material: 'Zinn' },
  { slot: 'Griffform', material: 'Fichte' },
  { slot: 'Griffmaterial', material: 'Hasen-Leder' },
  { slot: 'Verstärkungsmaterial', material: 'Kupfer' },
  { slot: 'Parierstange', material: 'Aluminium' }
];
assert.deepEqual(
  normalizeWeaponSlots(legacySlots).map(entry => entry.slot),
  ['baseMaterial', 'workingPart', 'back', 'gripCore', 'gripWrap', 'special', 'parry'],
  'Alte Slotnamen müssen auf die neue Bauteilsemantik normalisiert werden.'
);
assert.equal(rarityFactor(legacySlots), 1, 'Das alte Grundmaterial darf die neue Waffenseltenheit nicht bestimmen.');

assert.equal(reinforcementEffectText('Kupfer'), '+10 Prozentpunkte DS');
assert.equal(reinforcementEffectText('Fichte'), 'Kein Spezialeffekt');
assert.equal(reinforcementEffectText('Tanne'), '+15 % GES');
assert.equal(reinforcementEffectText('Hasen-Leder'), '+5 % P');

const recruit = calculateCharacterStats('recruit', [{ stats: sword }]);
closeTo(recruit.strengthFactor, 1.10);
closeTo(recruit.precision, 1.05);
closeTo(recruit.armor, 6);
closeTo(recruit.dodge, 0.12);
closeTo(recruit.threat, 50);
closeTo(recruit.critChance, 0.07);
closeTo(recruit.critDamage, 1.60);
closeTo(recruit.penetration, 0.10);
assert.equal(CHARACTER_CLASSES.fighter.threat, 100);
assert.equal(CHARACTER_CLASSES.archer.threat, 33);
assert.equal(CHARACTER_CLASSES.scholar.threat, 25);

const armored = weaponDamageAfterArmor({ stats: sword }, 100, recruit);
assert.ok(armored.raw > 0);
closeTo(armored.penetration, 0.10);
closeTo(armored.effectiveArmor, 90);
assert.ok(armored.afterArmor > 0 && armored.afterArmor < armored.raw);

console.log('Game-Core: ODS-Materialwerte, Baupläne, Charakterboni, feste Bedrohung und Kampfübergabe sind konsistent.');
