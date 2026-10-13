import assert from 'node:assert/strict';
import {
  getTavernPresentation
} from '../src/app/game/tavern-presentation-core.ts';

const classes = [
  {
    id: 'fighter',
    name: 'Kämpfer',
    role: 'frontline',
    maxHp: 40,
    maxEnergy: 100,
    armor: 3,
    dodge: 0.08,
    strengthFactor: 1.1,
    precision: 0.95
  },
  {
    id: 'scout',
    name: 'Späher',
    role: 'support',
    maxHp: 30,
    maxEnergy: 120,
    armor: 1,
    dodge: 0.14,
    strengthFactor: 0.9,
    precision: 1.08
  }
];

const available = getTavernPresentation(classes, 2, 4, 50_000, 12_345);
assert.equal(available.full, false);
assert.equal(available.canPay, true);
assert.equal(available.statusText, '');
assert.equal(available.openInnLabel, 'Inn-Ausbau öffnen');
assert.deepEqual(available.summaryStats, [
  { label: 'Kader', value: '2 / 4' },
  { label: 'Nächste Anwerbung', value: '1 Silber 23 Bronze 45 Nickel' }
]);
assert.deepEqual(available.capacityStats, [
  { label: 'Belegt', value: '2' },
  { label: 'Kapazität', value: '4' },
  { label: 'Nächste Kosten', value: '1 Silber 23 Bronze 45 Nickel' }
]);
assert.deepEqual(available.offers[0], {
  classId: 'fighter',
  name: 'Kämpfer',
  roleTag: 'FRONTLINE',
  stats: [
    { label: 'HP', value: '40' },
    { label: 'EN', value: '100' },
    { label: 'RÜS', value: '3' },
    { label: 'AUS', value: '8 %' },
    { label: 'STÄ', value: '1.10' },
    { label: 'PRÄ', value: '0.95' }
  ],
  recruitLabel: 'Kämpfer anwerben · 1 Silber 23 Bronze 45 Nickel',
  disabled: false
});
assert.equal(available.offers[1].roleTag, 'SUPPORT');
assert.equal(available.offers[1].stats[3].value, '14 %');
assert.equal(available.offers.every(entry => !entry.disabled), true);

const full = getTavernPresentation(classes, 4, 4, 0, 12_345);
assert.equal(full.full, true);
assert.equal(full.canPay, false);
assert.equal(full.statusText, 'Inn voll – zuerst einen weiteren Kaderplatz kaufen.');
assert.equal(full.offers.every(entry => entry.disabled), true);

const poor = getTavernPresentation(classes, 2, 4, 100, 12_345);
assert.equal(poor.full, false);
assert.equal(poor.canPay, false);
assert.equal(poor.statusText, 'Nicht genügend Geld für die Rekrutierung.');
assert.equal(poor.offers.every(entry => entry.disabled), true);

console.log('Tavernen-Präsentationscore: Kaderstatus, Klassenwerte, Kosten und Rekrutierungszustände sind konsistent.');
