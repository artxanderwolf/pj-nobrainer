import assert from 'node:assert/strict';
import { createWeaponPresentationCore, getComparisonPresentation } from '../src/app/game/weapon-presentation-core.ts';

const presentation = createWeaponPresentationCore({
  resolveFormName: (weaponForm, starter) => weaponForm === 'dagger' ? 'Dolch' : starter ? 'Einhänder' : 'Waffe',
  rarityFactor: slots => slots?.length ? 2 : 1,
  reinforcementEffectText: materialName => materialName === 'Kupfer' ? '+10 Prozentpunkte DS' : 'Kein Zusatzeffekt'
});

assert.deepEqual(getComparisonPresentation(10, null), null);
assert.deepEqual(getComparisonPresentation(10, 10), { text: '(±0)', tone: 'same' });
assert.deepEqual(getComparisonPresentation(0.7, 0.6, true), { text: '(+10 %)', tone: 'good' });
assert.deepEqual(getComparisonPresentation(8, 10), { text: '(−2.00)', tone: 'bad' });

const compare = {
  id: 1,
  name: 'Alt',
  weaponForm: 'dagger',
  slots: [{}],
  stats: {
    damagePerHit: 8,
    attackSpeed: 1.2,
    hitChance: 0.5,
    penetration: 0.1,
    expectedRaw: 4.8,
    reinforcementMaterial: null
  },
  valueNickel: 100
};

const weapon = {
  id: 2,
  name: 'Kupferklinge',
  weaponForm: 'dagger',
  slots: [{}, {}],
  stats: {
    damagePerHit: 10,
    attackSpeed: 1.2,
    hitChance: 0.6,
    penetration: 0.2,
    expectedRaw: 7.2,
    reinforcementMaterial: 'Kupfer'
  },
  valueNickel: 250
};

assert.equal(presentation.getRarityLabel(weapon), 'S2');
assert.deepEqual(presentation.getWeaponCardPresentation(weapon, compare), {
  title: 'Kupferklinge #2',
  formName: 'Dolch',
  rarityLabel: 'S2',
  reinforcementText: '+10 Prozentpunkte DS',
  stats: [
    { key: 'damagePerHit', label: 'SCH', value: { kind: 'text', text: '10.00' }, diff: { text: '(+2.00)', tone: 'good' } },
    { key: 'attackSpeed', label: 'GES', value: { kind: 'text', text: '1.20' }, diff: { text: '(±0)', tone: 'same' } },
    { key: 'hitChance', label: 'TRF', value: { kind: 'text', text: '60 %' }, diff: { text: '(+10 %)', tone: 'good' } },
    { key: 'penetration', label: 'DS', value: { kind: 'text', text: '20 %' }, diff: { text: '(+10 %)', tone: 'good' } },
    { key: 'expectedRaw', label: 'ROH', value: { kind: 'text', text: '7.20' }, diff: { text: '(+2.40)', tone: 'good' } },
    { key: 'value', label: 'WERT', value: { kind: 'currency', nickel: 250 }, diff: null }
  ]
});

const starter = presentation.getWeaponCardPresentation({
  id: 0,
  name: 'Starter',
  starter: true,
  stats: {},
  valueNickel: null
});
assert.equal(starter.formName, 'Einhänder');
assert.equal(starter.rarityLabel, 'START');
assert.equal(starter.reinforcementText, '');
assert.deepEqual(starter.stats.at(-1)?.value, { kind: 'text', text: 'Nicht verkäuflich' });

const unpriced = presentation.getWeaponCardPresentation({ id: 3, name: 'Unbekannt', stats: {} });
assert.deepEqual(unpriced.stats.at(-1)?.value, { kind: 'text', text: '–' });

console.log('Weapon-Presentation-Core: Form, Seltenheit, Verstärkung, Werte und Vergleichsdifferenzen sind konsistent.');
