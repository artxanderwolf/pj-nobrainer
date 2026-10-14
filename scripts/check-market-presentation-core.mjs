import assert from 'node:assert/strict';
import {
  getActiveMarketJobPresentation,
  getQueuedMarketJobPresentation,
  getMarketMaterialPresentation,
  getMarketWeaponPresentation
} from '../src/app/game/market-presentation-core.ts';

const formatCurrency = (value) => `${value} Nickel`;
const formatDuration = (seconds) => `${seconds}s`;

const active = getActiveMarketJobPresentation(
  { type: 'material', name: 'Kupfer', quantity: 3, valueNickel: 90, seconds: 30, finishesAt: 25_000 },
  1,
  10_000,
  formatCurrency,
  formatDuration
);
assert.deepEqual(active, {
  title: 'Platz 2: 3× Kupfer',
  remainingText: '15s',
  revenueValueText: '90 Nickel',
  progressPercent: 50
});

const finished = getActiveMarketJobPresentation(
  { type: 'weapon', name: 'Klinge', valueNickel: 120, seconds: 20, finishesAt: 5_000 },
  0,
  10_000,
  formatCurrency,
  formatDuration
);
assert.equal(finished.remainingText, '0s');
assert.equal(finished.progressPercent, 100);
assert.equal(finished.title, 'Platz 1: Klinge');

const queued = getQueuedMarketJobPresentation(
  { type: 'material', name: 'Fichte', quantity: 2, valueNickel: 40, seconds: 12 },
  0,
  formatCurrency,
  formatDuration
);
assert.deepEqual(queued, { title: '1. 2× Fichte', metaText: '12s · 40 Nickel' });

const material = getMarketMaterialPresentation('Zinn', 5, 3, 7, 4, true, formatCurrency, formatDuration);
assert.deepEqual(material, {
  title: 'Pro Stück: 7 Nickel · 4s',
  stockText: 'Bestand 5',
  previewText: '21 Nickel · 12s',
  sellDisabled: false
});

const clampedMaterial = getMarketMaterialPresentation('Zinn', 2, 99, 7, 4, false, formatCurrency, formatDuration);
assert.equal(clampedMaterial.previewText, '14 Nickel · 8s');
assert.equal(clampedMaterial.sellDisabled, true);

const weapon = getMarketWeaponPresentation('Kupferaxt', 17, 135, 45, true, formatCurrency);
assert.deepEqual(weapon, {
  title: 'Kupferaxt #17',
  tooltip: 'Verkaufswert: 135 Nickel · Verkaufsdauer: 45s',
  sellDisabled: false
});

const blockedWeapon = getMarketWeaponPresentation('Kupferaxt', 17, 135, 45, false, formatCurrency);
assert.equal(blockedWeapon.sellDisabled, true);

console.log('Market-Presentation-Core: aktive Verkäufe, Warteschlange, Materialvorschau und Waffenverkauf sind konsistent.');
