import assert from 'node:assert/strict';
import {
  formatMaterialValue,
  getMaterialIndexRowPresentation,
  getMaterialStorageRowPresentation,
  sortMaterialStorageEntries
} from '../src/app/game/material-presentation-core.ts';

assert.equal(formatMaterialValue(null), '–');
assert.equal(formatMaterialValue(undefined), '–');
assert.equal(formatMaterialValue(1), '1');
assert.equal(formatMaterialValue(1.234), '1,23');
assert.equal(formatMaterialValue(0.2, 'percent'), '20 %');
assert.equal(formatMaterialValue(0.05, 'factor'), '0,05');

const zeroStats = {
  hp: 0,
  energy: 0,
  armor: 0,
  dodge: 0,
  strengthFactor: 0,
  precision: 0,
  threat: 0,
  critChance: 0,
  critDamage: 0,
  hpRegenPerMinute: 0,
  energyRegenPerMinute: 0,
  experienceFactor: 0,
  lifeSteal: 0,
  penetration: 0
};

const row = getMaterialIndexRowPresentation(
  'Kupfer',
  {
    category: 'Metall',
    rarity: 1,
    stats: { ...zeroStats, hp: 8, armor: 2, strengthFactor: 0.05 },
    specialEffect: { stat: 'DS', amount: 0.10 }
  },
  '+10 Prozentpunkte DS',
  11
);

assert.deepEqual(row, {
  category: 'Metall',
  name: 'Kupfer',
  rarityText: 'S1',
  hpText: '8',
  energyText: '0',
  armorText: '2 %',
  dodgeText: '0 %',
  strengthFactorText: '0,05',
  precisionText: '0',
  threatText: '0',
  critChanceText: '0 %',
  critDamageText: '0 %',
  hpRegenText: '0',
  energyRegenText: '0',
  experienceText: '0 %',
  lifeStealText: '0 %',
  penetrationText: '0 %',
  specialStatText: 'DS',
  specialPercentText: '10 %',
  dungeonChanceText: '11 %'
});

const unavailable = getMaterialIndexRowPresentation(
  'Testmaterial',
  {
    category: 'Holz',
    rarity: 3,
    stats: zeroStats,
    specialEffect: null
  },
  'Kein Spezialeffekt',
  null
);
assert.equal(unavailable.dungeonChanceText, '– %');
assert.equal(unavailable.rarityText, 'S3');
assert.equal(unavailable.specialStatText, '–');
assert.equal(unavailable.specialPercentText, '–');
assert.equal(unavailable.armorText, '0 %');

const sortedStorage = sortMaterialStorageEntries([
  ['Zinn', { category: 'Metall', qty: 2 }],
  ['Fichte', { category: 'Holz', qty: 4 }],
  ['Kupfer', { category: 'Metall', qty: 3 }]
]);
assert.deepEqual(sortedStorage.map(([name]) => name), ['Fichte', 'Kupfer', 'Zinn']);

const storageRow = getMaterialStorageRowPresentation(
  'Kupfer',
  { category: 'Metall', qty: 3 },
  10,
  value => `${value} Nickel`
);
assert.deepEqual(storageRow, {
  name: 'Kupfer',
  category: 'Metall',
  quantityText: '3',
  valueText: '10 Nickel',
  tooltip: 'Verkaufswert: 10 Nickel'
});

console.log('Material-Presentation-Core: gemeinsame Statmatrix mit Rüstung in Prozent, SPE/SPE%, Sortierung, Seltenheit und Dungeonchance sind konsistent.');
