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

const row = getMaterialIndexRowPresentation(
  'Kupfer',
  {
    category: 'Metall',
    rarity: 1,
    baseDamage: 10,
    baseSpeed: 1,
    blade: 1.2,
    penetration: 0.2,
    gripSpeed: null,
    hitChance: null
  },
  '+10 Prozentpunkte DS',
  11
);

assert.deepEqual(row, {
  category: 'Metall',
  name: 'Kupfer',
  rarityText: 'S1',
  baseDamageText: '10',
  baseSpeedText: '1',
  bladeText: '1,2',
  penetrationText: '20 %',
  gripSpeedText: '–',
  hitChanceText: '–',
  reinforcementText: '+10 Prozentpunkte DS',
  dungeonChanceText: '11 %'
});

const unavailable = getMaterialIndexRowPresentation(
  'Testmaterial',
  {
    category: 'Holz',
    rarity: 3,
    baseDamage: null,
    baseSpeed: null,
    blade: null,
    penetration: null,
    gripSpeed: null,
    hitChance: null
  },
  'Kein Zusatzeffekt',
  null
);
assert.equal(unavailable.dungeonChanceText, '– %');
assert.equal(unavailable.rarityText, 'S3');

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

console.log('Material-Presentation-Core: Index- und Lagerdarstellung, Sortierung, Prozentformatierung, Seltenheit und Dungeonchance sind konsistent.');
