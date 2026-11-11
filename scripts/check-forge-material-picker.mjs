import assert from 'node:assert/strict';
import { calculateWeaponStats } from '../src/app/game/game-core.ts';
import { getWeaponMaterialColorById } from '../src/app/game/weapon-material-colors.ts';
import { getForgeMaterialEffects, getForgeMaterialIcon } from '../src/app/game/forge-material-picker-core.ts';

for (const [materialId, category, kind] of [
  [2, 'Holz', 'wood'],
  [5, 'Metall', 'metal'],
  [9, 'Leder', 'leather']
]) {
  const icon = getForgeMaterialIcon(materialId, category);
  assert.equal(icon.kind, kind);
  assert.equal(icon.color, getWeaponMaterialColorById(materialId),
    'Materialicons muessen dieselbe ID-Farbe wie fertige Waffen verwenden.');
}
assert.equal(getForgeMaterialIcon(9999, 'Metall').color, '#8A8A8A');

const chosenParts = [
  { slot: 'back', materialId: 2 },
  { slot: 'gripCore', materialId: 2 },
  { slot: 'gripWrap', materialId: 9 },
  { slot: 'special', materialId: 2 }
];
const before = calculateWeaponStats(chosenParts, 'dagger');
const after = calculateWeaponStats([...chosenParts, { slot: 'workingPart', materialId: 5 }], 'dagger');
const impact = getForgeMaterialEffects('dagger', 'workingPart', 5, chosenParts);
assert.ok(impact.weapon.some(value => value.startsWith('SCH +')), 'Ein Metallstat muss den wirksamen Schadensbeitrag ausweisen.');
assert.ok(impact.weapon.some(value => value.startsWith('ROH +')));
assert.ok(impact.character.some(value => value.startsWith('Stärke +')));
assert.ok(after.damagePerHit > before.damagePerHit);

const special = getForgeMaterialEffects('dagger', 'special', 2, chosenParts);
assert.ok(Array.isArray(special.weapon) && Array.isArray(special.character));
assert.deepEqual(
  getForgeMaterialEffects('dagger', 'special', 2, chosenParts),
  getForgeMaterialEffects('dagger', 'special', 2, chosenParts),
  'Materialwirkung ist deterministisch, ohne Einfluss auf Bestand oder Saves.'
);
console.log('S05: ID-Farben für Holz/Metall/Leder und dynamische Waffen-/Charakterstatbeiträge geprüft.');
