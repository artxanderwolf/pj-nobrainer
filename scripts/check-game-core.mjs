import assert from 'node:assert/strict';
import {
  CHARACTER_CLASSES,
  CONFIG,
  MATERIALS,
  calculateCharacterStats,
  calculateWeaponStats,
  createStatModifiers,
  getDungeonEnemyDefinition,
  getDungeonMaterialDropWeight,
  getMaterialById,
  getWeaponCraftingSlots,
  getWeaponHandCount,
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
].sort(), 'Die Erweiterung darf keine Materialien hinzufügen oder entfernen.');

const expectedForms = {
  dagger: ['Dolch', 1, 6, 1.4, 0.60, 0.5],
  sword: ['1H Schwert', 1, 10, 1.0, 0.55, 1.0],
  axe1h: ['1H Axt', 1, 12, 0.85, 0.52, 1.0],
  sword2h: ['2H Schwert', 2, 16, 0.80, 0.55, 1.75],
  axe2h: ['2H Axt', 2, 20, 0.70, 0.50, 1.75],
  bow: ['Bogen', 2, 11, 0.90, 0.65, 2.0],
  staff: ['Stab', 2, 10, 1.00, 0.60, 1.10]
};
assert.deepEqual(Object.keys(CONFIG.forge.weaponForms), Object.keys(expectedForms));
for (const [id, [name, hands, baseDamage, baseSpeed, baseHitChance, timeFactor]] of Object.entries(expectedForms)) {
  const form = CONFIG.forge.weaponForms[id];
  assert.equal(form.name, name);
  assert.equal(getWeaponHandCount(id), hands, `${name}: Handbelegung`);
  closeTo(form.baseDamage, baseDamage);
  closeTo(form.baseSpeed, baseSpeed);
  closeTo(form.baseHitChance, baseHitChance);
  closeTo(form.timeFactor, timeFactor);
}

const quantities = form => Object.fromEntries(getWeaponCraftingSlots(form).map(slot => [slot, getWeaponSelectionQuantity(form, slot)]));
assert.deepEqual(quantities('dagger'), { workingPart: 1, back: 1, gripCore: 1, gripWrap: 1, special: 1 });
assert.deepEqual(quantities('sword'), { workingPart: 2, back: 2, gripCore: 1, gripWrap: 1, special: 1, parry: 1 });
assert.deepEqual(quantities('axe1h'), { workingPart: 1, back: 1, gripCore: 3, gripWrap: 2, special: 1 });
assert.deepEqual(quantities('sword2h'), { workingPart: 4, back: 4, gripCore: 2, gripWrap: 1, special: 1, parry: 2 });
assert.deepEqual(quantities('axe2h'), { workingPart: 2, back: 2, gripCore: 6, gripWrap: 3, special: 1 });
assert.deepEqual(quantities('bow'), { back: 1, gripCore: 5, gripWrap: 6, special: 1, bowstring: 3 });
assert.deepEqual(quantities('staff'), { back: 1, gripCore: 5, gripWrap: 2, special: 1 });
assert.deepEqual(
  Object.fromEntries(Object.keys(expectedForms).map(id => [id, Object.values(quantities(id)).reduce((a, b) => a + b, 0)])),
  { dagger: 5, sword: 8, axe1h: 8, sword2h: 14, axe2h: 14, bow: 16, staff: 9 }
);
assert.equal(CONFIG.forge.weaponForms.dagger.parts.some(part => part.id === 'parry'), false);
assert.equal(CONFIG.forge.weaponForms.sword.parts.find(part => part.id === 'parry')?.materialSlot, 'parry');
assert.equal(CONFIG.forge.weaponForms.bow.parts.find(part => part.id === 'bowstring')?.quantity, 3);
assert.deepEqual(CONFIG.forge.weaponForms.bow.parts.find(part => part.id === 'bowstring')?.statKeys, ['strengthFactor', 'penetration']);
assert.equal(CONFIG.forge.weaponForms.bow.parts.some(part => part.id === 'workingPart'), false, 'Einhändig/2H darf keinen künstlichen Bauslot erzeugen.');

assert.equal(MATERIALS['Hasen-Leder'].rarity, 1);
closeTo(MATERIALS.Tanne.stats.precision, 0.10);
closeTo(MATERIALS.Aluminium.stats.strengthFactor, 0.10);
closeTo(MATERIALS['Lederfetzen'].stats.strengthFactor, 0.01);
closeTo(MATERIALS['Lederfetzen'].stats.penetration, 0.01);
closeTo(MATERIALS['Hasen-Leder'].stats.strengthFactor, 0.03);
closeTo(MATERIALS['Hasen-Leder'].stats.penetration, 0.02);
closeTo(MATERIALS['Fuchs-Leder'].stats.strengthFactor, 0.05);
closeTo(MATERIALS['Fuchs-Leder'].stats.penetration, 0.04);
closeTo(MATERIALS['Fuchs-Leder'].stats.critChance, 0.04);
assert.deepEqual(MATERIALS.Kupfer.specialEffect, { stat: 'DS', amount: 0.10 });
assert.equal(MATERIALS['Morsche Fichte'].specialEffect, null);
assert.deepEqual(MATERIALS.Fichte.specialEffect, { stat: 'DS', amount: 0.05 });
assert.deepEqual(MATERIALS.Tanne.specialEffect, { stat: 'P', amount: 0.10 });
assert.deepEqual(MATERIALS['Hasen-Leder'].specialEffect, { stat: 'GES', amount: 0.15 });
assert.deepEqual(MATERIALS['Fuchs-Leder'].specialEffect, { stat: 'P', amount: 0.05 });
assert.equal(MATERIALS['Morsche Fichte'].materialId, 1);
assert.equal(MATERIALS['Morsche Fichte'].dungeonDropWeight, 81);
assert.equal(MATERIALS.Fichte.dungeonDropWeight, 8);
assert.equal(MATERIALS.Tanne.dungeonDropWeight, 2);
assert.equal(getMaterialById(9)?.[0], 'Lederfetzen');
assert.equal(getDungeonMaterialDropWeight(1, 'Kupfer'), 8);
assert.deepEqual(getDungeonEnemyDefinition(1, 'recruit'), { name: 'Neuling', lootMaterialIds: [9, 5, 3], xpDrop: 10 });
assert.deepEqual(getDungeonEnemyDefinition(1, 'fighter'), { name: 'Tank', lootMaterialIds: [9, 4, 6], xpDrop: 10 });
assert.deepEqual(getDungeonEnemyDefinition(1, 'archer'), { name: 'Jäger', lootMaterialIds: [9, 8, 7], xpDrop: 10 });
assert.deepEqual(getDungeonEnemyDefinition(1, 'scholar'), { name: 'Lehrling', lootMaterialIds: [9, 2, 1], xpDrop: 10 });

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

const bowSlots = [
  { slot: 'back', material: 'Fichte' },
  { slot: 'gripCore', material: 'Tanne' },
  { slot: 'gripWrap', material: 'Fuchs-Leder' },
  { slot: 'special', material: 'Fichte' },
  { slot: 'bowstring', material: 'Fuchs-Leder' }
];
assert.equal(isWeaponSelectionComplete(bowSlots, 'bow'), true);
const bow = calculateWeaponStats(bowSlots, 'bow');
closeTo(bow.characterModifiers.armor, 1);
closeTo(bow.characterModifiers.dodge, 0.02);
closeTo(bow.characterModifiers.strengthFactor, 0.05);
closeTo(bow.characterModifiers.precision, 0.20);
closeTo(bow.characterModifiers.critChance, 0.12);
closeTo(bow.characterModifiers.penetration, 0.09);
closeTo(bow.damagePerHit, 11.55);
closeTo(bow.attackSpeed, 0.9);
closeTo(bow.hitChance, 0.78);
closeTo(bow.penetration, 0.09);
closeTo(bow.expectedRaw, 8.1081);

const specialBaseSlots = [
  { slot: 'workingPart', material: 'Zinn' },
  { slot: 'back', material: 'Zinn' },
  { slot: 'gripCore', material: 'Fichte' },
  { slot: 'gripWrap', material: 'Lederfetzen' }
];
const noSpecial = calculateWeaponStats([...specialBaseSlots, { slot: 'special', material: 'Morsche Fichte' }], 'dagger');
closeTo(noSpecial.specialSpeedFactor, 1);
closeTo(noSpecial.reinforcementHitChanceAdd, 0);
closeTo(noSpecial.reinforcementPenetrationAdd, 0);
const penetrationSpecial = calculateWeaponStats([...specialBaseSlots, { slot: 'special', material: 'Fichte' }], 'dagger');
closeTo(penetrationSpecial.penetration, 0.05);
closeTo(penetrationSpecial.reinforcementPenetrationAdd, 0.05);
const precisionSpecial = calculateWeaponStats([...specialBaseSlots, { slot: 'special', material: 'Tanne' }], 'dagger');
closeTo(precisionSpecial.characterModifiers.precision, 0.20);
closeTo(precisionSpecial.reinforcementHitChanceAdd, 0.10);
closeTo(precisionSpecial.hitChance, 0.72);
const speedSpecial = calculateWeaponStats([...specialBaseSlots, { slot: 'special', material: 'Hasen-Leder' }], 'dagger');
closeTo(speedSpecial.specialSpeedFactor, 1.15);
closeTo(speedSpecial.attackSpeed, 1.61);

const legacySlots = [
  { slot: 'Waffentyp', material: 'Aluminium' },
  { slot: 'Schneide', material: 'Kupfer' },
  { slot: 'Rückseite', material: 'Zinn' },
  { slot: 'Griffform', material: 'Fichte' },
  { slot: 'Griffmaterial', material: 'Hasen-Leder' },
  { slot: 'Verstärkungsmaterial', material: 'Kupfer' },
  { slot: 'Parierstange', material: 'Aluminium' },
  { slot: 'Sehne', material: 'Fuchs-Leder' }
];
assert.deepEqual(
  normalizeWeaponSlots(legacySlots).map(entry => entry.slot),
  ['baseMaterial', 'workingPart', 'back', 'gripCore', 'gripWrap', 'special', 'parry', 'bowstring']
);
assert.equal(rarityFactor(legacySlots), 1);

assert.equal(reinforcementEffectText('Kupfer'), '+10 Prozentpunkte DS');
assert.equal(reinforcementEffectText('Morsche Fichte'), 'Kein Spezialeffekt');
assert.equal(reinforcementEffectText('Fichte'), '+5 Prozentpunkte DS');
assert.equal(reinforcementEffectText('Tanne'), '+10 % P');
assert.equal(reinforcementEffectText('Hasen-Leder'), '+15 % GES');
assert.equal(reinforcementEffectText('Fuchs-Leder'), '+5 % P');

const swordWeapon = { id: 77, stats: sword };
const recruit = calculateCharacterStats('recruit', [swordWeapon]);
closeTo(recruit.strengthFactor, 1.10);
closeTo(recruit.precision, 1.05);
closeTo(recruit.armor, 6);
closeTo(recruit.dodge, 0.12);
closeTo(recruit.threat, 50);
closeTo(recruit.critChance, 0.07);
closeTo(recruit.critDamage, 1.60);
closeTo(recruit.penetration, 0.10);
const sameTwoHandedWeaponTwice = calculateCharacterStats('recruit', [swordWeapon, swordWeapon]);
assert.deepEqual(sameTwoHandedWeaponTwice, recruit, 'Eine 2H-Waffe in beiden Handplätzen darf ihre Charakterboni nur einmal beitragen.');
const clonedSameId = calculateCharacterStats('recruit', [swordWeapon, { id: 77, stats: sword }]);
assert.deepEqual(clonedSameId, recruit, 'Auch dieselbe Waffen-ID aus zwei Zustandsreferenzen darf nur einmal beitragen.');

const levelTwoRecruit = calculateCharacterStats('recruit', [swordWeapon], 1.1);
closeTo(levelTwoRecruit.maxHp, 33);
closeTo(levelTwoRecruit.maxEnergy, 110);
closeTo(levelTwoRecruit.armor, 6.2);
closeTo(levelTwoRecruit.dodge, 0.13);
closeTo(levelTwoRecruit.strengthFactor, 1.11, 'SF soll pro Level nur mit Faktor 1,01 skalieren.');
closeTo(levelTwoRecruit.precision, 1.06, 'PRÄ soll pro Level nur mit Faktor 1,01 skalieren.');
closeTo(levelTwoRecruit.threat, 50, 'Bedrohung bleibt unabhängig vom Level auf dem Klassen-Grundwert.');
closeTo(levelTwoRecruit.critChance, 0.075);
closeTo(levelTwoRecruit.critDamage, 1.615, 'K-S soll pro Level nur mit Faktor 1,01 skalieren.');
closeTo(levelTwoRecruit.hpRegenPerMinute, 0, 'Null-Grundwerte dürfen durch Levelanstieg nicht entstehen.');
closeTo(levelTwoRecruit.energyRegenPerMinute, 5.5);
closeTo(levelTwoRecruit.experienceFactor, 1, 'ERF darf sich durch Levelaufstiege nicht mehr verändern.');
closeTo(levelTwoRecruit.lifeSteal, 0);
closeTo(levelTwoRecruit.penetration, 0.10, 'Ausrüstungsbonus wird erst nach der Grundwertskalierung addiert.');

const levelThreeRecruit = calculateCharacterStats('recruit', [], 1.21);
closeTo(levelThreeRecruit.maxHp, 36.3);
closeTo(levelThreeRecruit.strengthFactor, 1.0201);
closeTo(levelThreeRecruit.precision, 1.0201);
closeTo(levelThreeRecruit.critDamage, 1.53015);
closeTo(levelThreeRecruit.experienceFactor, 1);

const cappedArmorCharacter = calculateCharacterStats('fighter', [{
  id: 999,
  stats: { characterModifiers: createStatModifiers({ armor: 100 }) }
}]);
closeTo(cappedArmorCharacter.armor, 80, 'Finale Charakterrüstung muss bei 80 % gedeckelt werden.');

assert.equal(CHARACTER_CLASSES.fighter.threat, 100);
assert.equal(CHARACTER_CLASSES.archer.threat, 33);
assert.equal(CHARACTER_CLASSES.scholar.threat, 25);

const armored = weaponDamageAfterArmor({ stats: sword }, 100, recruit);
assert.ok(armored.raw > 0);
closeTo(armored.penetration, 0.10);
closeTo(armored.effectiveArmor, 72);
closeTo(armored.reduction, 0.72);
closeTo(armored.afterArmor, armored.raw * 0.28);

console.log('Game-Core: Material-SPE, Waffenbau, stat-spezifische Levelskalierung, 2H-Deduplizierung und Kampfübergabe sind konsistent.');