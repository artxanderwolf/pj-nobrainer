import assert from 'node:assert/strict';
import { getWeaponImageRenderPlan } from '../src/app/game/weapon-image-presentation-core.ts';
import { getWeaponImageMarkup } from '../src/app/game/weapon-image-markup-presentation.ts';

const daggerPlan = getWeaponImageRenderPlan({
  weaponForm: 'dagger',
  slots: [
    { slot: 'workingPart', materialId: 5 },
    { slot: 'back', materialId: 4 },
    { slot: 'gripCore', materialId: 2 },
    { slot: 'gripWrap', materialId: 8 }
  ]
});
const dagger = getWeaponImageMarkup(daggerPlan, {
  ariaLabel: 'Dolch "Kupfer" & Test',
  className: 'weapon-card-icon invalid<script>'
});
assert.match(dagger, /class="weapon-image weapon-image-materials weapon-card-icon"/);
assert.match(dagger, /data-weapon-form="dagger"/);
assert.match(dagger, /aria-label="Dolch &quot;Kupfer&quot; &amp; Test"/);
assert.doesNotMatch(dagger, /invalid<script>/);
assert.match(dagger, /data-weapon-image-layer="workingPart" style="--weapon-image-color:#B66A47;--weapon-mask-x:-128px"/);
assert.match(dagger, /data-weapon-image-layer="back" style="--weapon-image-color:#9AA3B0;--weapon-mask-x:-192px"/);
assert.ok(dagger.lastIndexOf('data-weapon-image-layer="outline"') > dagger.lastIndexOf('data-weapon-image-layer="gripWrap"'));

const fallbackPlan = getWeaponImageRenderPlan({ weaponForm: 'sword', starter: true, slots: [] });
const fallback = getWeaponImageMarkup(fallbackPlan);
assert.match(fallback, /data-weapon-image-kind="form-fallback"/);
assert.match(fallback, /data-weapon-fallback="starter"/);
assert.match(fallback, /data-weapon-image-layer="silhouette" style="--weapon-image-color:#8A8A8A;--weapon-mask-x:0px"/);
assert.match(fallback, /data-weapon-image-layer="outline" style="--weapon-image-color:#000000;--weapon-mask-x:-64px"/);
assert.doesNotMatch(fallback, /data-weapon-image-layer="workingPart"/);
assert.match(fallback, /aria-hidden="true"/);

const previewPlan = getWeaponImageRenderPlan({
  weaponForm: 'dagger',
  slots: [{ slot: 'workingPart', materialId: 5 }]
}, 'preview');
const preview = getWeaponImageMarkup(previewPlan);
assert.match(preview, /data-weapon-image-layer="gripCore" style="--weapon-image-color:#8A8A8A;--weapon-mask-x:-256px"/);

const unknown = getWeaponImageMarkup(getWeaponImageRenderPlan({ weaponForm: 'laser', slots: [] }));
assert.match(unknown, /data-weapon-form="generic"/);
assert.match(unknown, /weapon-image-generic-shape/);
assert.doesNotMatch(unknown, /weapon-image-layer/);

console.log('Weapon-Image-Markup-Presentation: Materiallayer, Outline, Fallback, Preview, Accessibility und sichere Klassen sind konsistent.');
