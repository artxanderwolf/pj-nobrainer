import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  VISIBLE_WEAPON_IMAGE_SLOTS_BY_FORM,
  WEAPON_MASK_ATLAS_CELL_INDEX,
  getVisibleWeaponImageSlots,
  getWeaponImageRenderPlan,
  resolveWeaponImageForm
} from '../src/app/game/weapon-image-presentation-core.ts';
import {
  WEAPON_FALLBACK_COLOR,
  WEAPON_MATERIAL_COLORS_BY_ID,
  WEAPON_OUTLINE_COLOR,
  getWeaponMaterialColorById
} from '../src/app/game/weapon-material-colors.ts';

assert.equal(WEAPON_FALLBACK_COLOR, '#8A8A8A');
assert.equal(WEAPON_OUTLINE_COLOR, '#000000');
assert.deepEqual(WEAPON_MASK_ATLAS_CELL_INDEX, {
  silhouette: 0,
  outline: 1,
  workingPart: 2,
  back: 3,
  gripCore: 4,
  gripWrap: 5,
  parry: 6,
  bowstring: 7
});

assert.deepEqual(VISIBLE_WEAPON_IMAGE_SLOTS_BY_FORM, {
  dagger: ['workingPart', 'back', 'gripCore', 'gripWrap'],
  sword: ['workingPart', 'back', 'gripCore', 'gripWrap', 'parry'],
  axe1h: ['workingPart', 'back', 'gripCore', 'gripWrap'],
  sword2h: ['workingPart', 'back', 'gripCore', 'gripWrap', 'parry'],
  axe2h: ['workingPart', 'back', 'gripCore', 'gripWrap'],
  bow: ['back', 'gripCore', 'gripWrap', 'bowstring'],
  staff: ['back', 'gripCore', 'gripWrap']
});

assert.equal(resolveWeaponImageForm('dagger'), 'dagger');
assert.equal(resolveWeaponImageForm('unbekannt'), null);
assert.deepEqual(getVisibleWeaponImageSlots('bow'), ['back', 'gripCore', 'gripWrap', 'bowstring']);
assert.deepEqual(getVisibleWeaponImageSlots('unbekannt'), []);

const materialsCsv = readFileSync(new URL('../balancing/tables/materials.csv', import.meta.url), 'utf8').trim();
const currentMaterialIds = materialsCsv
  .split(/\r?\n/)
  .slice(1)
  .filter(Boolean)
  .map(line => Number(line.split(',')[0]))
  .filter(Number.isInteger)
  .sort((a, b) => a - b);
assert.deepEqual(Object.keys(WEAPON_MATERIAL_COLORS_BY_ID).map(Number).sort((a, b) => a - b), currentMaterialIds);
for (const materialId of currentMaterialIds) {
  assert.match(getWeaponMaterialColorById(materialId) ?? '', /^#[0-9A-F]{6}$/i);
}
assert.equal(getWeaponMaterialColorById(null), null);
assert.equal(getWeaponMaterialColorById(999), null);
assert.equal(getWeaponMaterialColorById('Kupfer'), null, 'Anzeigenamen dürfen keine technische Materialidentität sein.');

const dagger = getWeaponImageRenderPlan({
  weaponForm: 'dagger',
  slots: [
    { slot: 'workingPart', materialId: 5 },
    { slot: 'back', materialId: 4 },
    { slot: 'gripCore', materialId: 2 },
    { slot: 'gripWrap', materialId: 8 },
    { slot: 'special', materialId: 6 }
  ]
});
assert.equal(dagger.kind, 'materials');
assert.equal(dagger.weaponForm, 'dagger');
assert.equal(dagger.silhouetteColor, null);
assert.deepEqual(dagger.layers.map(layer => [layer.slot, layer.materialId, layer.color, layer.atlasCell, layer.fallback]), [
  ['workingPart', 5, '#B66A47', 2, false],
  ['back', 4, '#9AA3B0', 3, false],
  ['gripCore', 2, '#7E5835', 4, false],
  ['gripWrap', 8, '#9B5A32', 5, false]
]);
assert.equal(dagger.layers.some(layer => layer.slot === 'special'), false);

const sword = getWeaponImageRenderPlan({
  weaponForm: 'sword',
  slots: [
    { slot: 'workingPart', materialId: 4 },
    { slot: 'back', materialId: 3 },
    { slot: 'gripCore', materialId: 2 },
    { slot: 'gripWrap', materialId: 7 },
    { slot: 'parry', materialId: 6 }
  ]
});
assert.equal(sword.kind, 'materials');
assert.deepEqual(sword.layers.map(layer => layer.slot), ['workingPart', 'back', 'gripCore', 'gripWrap', 'parry']);
assert.equal(sword.layers.at(-1)?.atlasCell, 6);

const bow = getWeaponImageRenderPlan({
  weaponForm: 'bow',
  slots: [
    { slot: 'back', materialId: 3 },
    { slot: 'gripCore', materialId: 2 },
    { slot: 'gripWrap', materialId: 9 },
    { slot: 'bowstring', materialId: 7 },
    { slot: 'workingPart', materialId: 5 }
  ]
});
assert.equal(bow.kind, 'materials');
assert.deepEqual(bow.layers.map(layer => layer.slot), ['back', 'gripCore', 'gripWrap', 'bowstring']);
assert.equal(bow.layers.at(-1)?.atlasCell, 7);

const partialPreview = getWeaponImageRenderPlan({
  weaponForm: 'dagger',
  slots: [
    { slot: 'workingPart', materialId: 5 },
    { slot: 'back', materialId: 4 }
  ]
}, 'preview');
assert.equal(partialPreview.kind, 'materials');
assert.deepEqual(partialPreview.layers.map(layer => [layer.slot, layer.color, layer.fallback]), [
  ['workingPart', '#B66A47', false],
  ['back', '#9AA3B0', false],
  ['gripCore', WEAPON_FALLBACK_COLOR, true],
  ['gripWrap', WEAPON_FALLBACK_COLOR, true]
]);

const incompleteWeapon = getWeaponImageRenderPlan({
  weaponForm: 'dagger',
  slots: [{ slot: 'workingPart', materialId: 5 }]
});
assert.deepEqual(
  {
    kind: incompleteWeapon.kind,
    silhouetteColor: incompleteWeapon.silhouetteColor,
    layers: incompleteWeapon.layers,
    reason: incompleteWeapon.fallbackReason
  },
  { kind: 'form-fallback', silhouetteColor: WEAPON_FALLBACK_COLOR, layers: [], reason: 'invalid-slots' }
);

const starter = getWeaponImageRenderPlan({ weaponForm: 'sword', starter: true, slots: [] });
assert.equal(starter.kind, 'form-fallback');
assert.equal(starter.fallbackReason, 'starter');
assert.equal(starter.silhouetteColor, WEAPON_FALLBACK_COLOR);

const unknownMaterial = getWeaponImageRenderPlan({
  weaponForm: 'staff',
  slots: [
    { slot: 'back', materialId: 999 },
    { slot: 'gripCore', materialId: 2 },
    { slot: 'gripWrap', materialId: 8 }
  ]
});
assert.equal(unknownMaterial.kind, 'form-fallback');
assert.equal(unknownMaterial.fallbackReason, 'invalid-slots');

const duplicateVisibleSlot = getWeaponImageRenderPlan({
  weaponForm: 'dagger',
  slots: [
    { slot: 'workingPart', materialId: 5 },
    { slot: 'workingPart', materialId: 4 },
    { slot: 'back', materialId: 4 },
    { slot: 'gripCore', materialId: 2 },
    { slot: 'gripWrap', materialId: 8 }
  ]
});
assert.equal(duplicateVisibleSlot.kind, 'form-fallback');
assert.equal(duplicateVisibleSlot.fallbackReason, 'invalid-slots');

const unknownForm = getWeaponImageRenderPlan({ weaponForm: 'laser', slots: [] });
assert.equal(unknownForm.kind, 'generic-fallback');
assert.equal(unknownForm.weaponForm, null);
assert.equal(unknownForm.fallbackReason, 'unknown-form');
assert.equal(unknownForm.silhouetteColor, WEAPON_FALLBACK_COLOR);

console.log('Weapon-Image-Presentation-Core: ID-Farben, Form-/Slot-Mapping, Atlas-Protokoll, Preview und Fallbacks sind konsistent.');
