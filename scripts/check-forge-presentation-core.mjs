import assert from 'node:assert/strict';
import {
  getActiveForgeJobPresentation,
  getForgePreviewPresentation,
  getQueuedForgeJobPresentation
} from '../src/app/game/forge-presentation-core.ts';

const stats = {
  damagePerHit: 12.345,
  materialBaseDamage: 10,
  formDamageFactor: 1,
  attackSpeed: 1.234,
  materialBaseSpeed: 1.1,
  formSpeedFactor: 1,
  hitChance: 0.777,
  expectedRaw: 9.876,
  penetration: 0.246
};

let currencyCalls = 0;
let reinforcementCalls = 0;
const incomplete = getForgePreviewPresentation(
  { complete: false, hasMaterials: false, hasCapacity: false, seconds: 42, valueNickel: 140, factor: 1.4, stats, reinforcementMaterial: 'Kupfer' },
  () => { currencyCalls += 1; return '140 Nickel'; },
  () => { reinforcementCalls += 1; return '+10 % Geschwindigkeit'; }
);
assert.deepEqual(incomplete, {
  timeText: '–', valueText: '–', damageText: '–', damageBaseInfo: '', speedText: '–', speedBaseInfo: '', hitText: '–', rawText: '–', penetrationText: '–', rarityText: '–', reinforcementText: 'Spezialeffekt: –', startDisabled: true
});
assert.equal(currencyCalls, 0);
assert.equal(reinforcementCalls, 0);

const ready = getForgePreviewPresentation(
  { complete: true, hasMaterials: true, hasCapacity: true, seconds: 42, valueNickel: 140, factor: 1.4, stats, reinforcementMaterial: 'Kupfer' },
  value => `${value} Nickel`,
  material => material === 'Kupfer' ? '+10 % Geschwindigkeit' : 'Kein Zusatzeffekt'
);
assert.deepEqual(ready, {
  timeText: '42 s',
  valueText: '140 Nickel',
  damageText: '12.35',
  damageBaseInfo: 'Waffenbasis 10.00',
  speedText: '1.23',
  speedBaseInfo: 'Waffenbasis 1.10',
  hitText: '78 %',
  rawText: '9.88',
  penetrationText: '25 %',
  rarityText: '1.40',
  reinforcementText: 'Spezialeffekt: +10 % Geschwindigkeit',
  startDisabled: false
});

const noMaterials = getForgePreviewPresentation(
  { complete: true, hasMaterials: false, hasCapacity: true, seconds: 1, valueNickel: 1, factor: 1, stats, reinforcementMaterial: null },
  () => '1 Nickel',
  () => 'Kein Zusatzeffekt'
);
assert.equal(noMaterials.startDisabled, true);

const noCapacity = getForgePreviewPresentation(
  { complete: true, hasMaterials: true, hasCapacity: false, seconds: 1, valueNickel: 1, factor: 1, stats, reinforcementMaterial: null },
  () => '1 Nickel',
  () => 'Kein Zusatzeffekt'
);
assert.equal(noCapacity.startDisabled, true);

const activeJob = getActiveForgeJobPresentation(
  { weaponName: 'Kupferklinge', totalSeconds: 60, finishesAt: 31_000, valueNickel: 175, stats: { expectedRaw: 8.765 } },
  0, 1_000, value => `${value} Nickel`, seconds => `${seconds}s`
);
assert.deepEqual(activeJob, { title: 'Platz 1: Kupferklinge', remainingText: '30s verbleibend', progressPercent: 50, rawText: '8.77', valueText: '175 Nickel' });

const queuedJob = getQueuedForgeJobPresentation(
  { weaponName: 'Eisendolch', totalSeconds: 45, valueNickel: 120 },
  2,
  seconds => `${seconds}s`
);
assert.deepEqual(queuedJob, { title: '3. Eisendolch', metaText: '45s Herstellungszeit' });

console.log('Forge-Presentation-Core: Leistungswert, Bauplanvorschau sowie aktive und wartende Schmiedeaufträge sind konsistent.');
