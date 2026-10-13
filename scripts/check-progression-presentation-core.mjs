import assert from 'node:assert/strict';
import {
  getUpgradeButtonPresentation,
  getUpgradeCardsPresentation
} from '../src/app/game/progression-presentation-core.ts';

const formatCurrency = value => `Kosten ${value}`;

const offers = {
  inn: { reason: 'ready', current: 2, max: 8, costNickel: 12_345, label: 'Kaderplatz' },
  forgeSlots: { reason: 'max', current: 4, max: 4, costNickel: 99_999, label: 'Herstellungsplatz' },
  forgeQueue: { reason: 'insufficient-funds', current: 2, max: 8, costNickel: 23_456, label: 'Warteschlangenplatz' },
  marketSlots: { reason: 'ready', current: 1, max: 4, costNickel: 34_567, label: 'Verkaufsplatz' },
  marketQueue: { reason: 'ready', current: 3, max: 8, costNickel: 45_678, label: 'Markt-Warteschlangenplatz' }
};

assert.deepEqual(getUpgradeButtonPresentation('inn', offers.inn, formatCurrency), {
  kind: 'inn',
  text: '+1 Kaderplatz · Kosten 12345',
  disabled: false,
  primary: true
});

assert.deepEqual(getUpgradeButtonPresentation('forgeSlots', offers.forgeSlots, formatCurrency), {
  kind: 'forgeSlots',
  text: 'Herstellungsplatz: Maximum erreicht',
  disabled: true,
  primary: false
});

assert.deepEqual(getUpgradeButtonPresentation('forgeQueue', offers.forgeQueue, formatCurrency), {
  kind: 'forgeQueue',
  text: '+1 Warteschlangenplatz · Kosten 23456',
  disabled: true,
  primary: true
});

const presentation = getUpgradeCardsPresentation({
  characterCount: 2,
  innCapacity: 4,
  forgeJobCount: 1,
  forgeSlotCapacity: 4,
  forgeQueueCount: 2,
  forgeQueueCapacity: 2,
  marketJobCount: 1,
  marketSlotCapacity: 1,
  marketQueueCount: 3,
  marketQueueCapacity: 3,
  offers
}, formatCurrency);

assert.deepEqual(presentation.inn.stats, [
  { label: 'Belegt / Kapazität', value: '2 / 4' }
]);
assert.equal(presentation.inn.note, '+1 Platz je Upgrade · Maximum 8');
assert.equal(presentation.inn.buttons[0].text, '+1 Kaderplatz · Kosten 12345');

assert.deepEqual(presentation.forge.stats, [
  { label: 'Herstellungsplätze', value: '1 / 4' },
  { label: 'Warteschlange', value: '2 / 2' }
]);
assert.equal(presentation.forge.buttons[0].primary, false);
assert.equal(presentation.forge.buttons[1].disabled, true);

assert.deepEqual(presentation.market.stats, [
  { label: 'Verkaufsplätze', value: '1 / 1' },
  { label: 'Warteschlange', value: '3 / 3' }
]);
assert.equal(presentation.market.buttons.every(button => !button.disabled), true);
assert.equal(presentation.market.note, '');

console.log('Progression-Presentation-Core: Ausbauwerte, Buttonzustände, Kostenlabels und Maximumzustände sind konsistent.');
