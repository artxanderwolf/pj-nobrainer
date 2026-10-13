import assert from 'node:assert/strict';
import { getForgePreviewPresentation } from '../src/app/game/forge-presentation-core.ts';

const stats = {
  damagePerHit: 12.345,
  materialBaseDamage: 10,
  formDamageFactor: 1.2,
  attackSpeed: 1.234,
  materialBaseSpeed: 1.1,
  formSpeedFactor: 1.1,
  hitChance: 0.777,
  expectedRaw: 9.876,
  penetration: 0.246
};

let currencyCalls = 0;
let reinforcementCalls = 0;
const incomplete = getForgePreviewPresentation(
  {
    complete: false,
    hasMaterials: false,
    hasCapacity: false,
    seconds: 42,
    valueNickel: 140,
    factor: 1.4,
    stats,
    reinforcementMaterial: 'Kupfer'
  },
  () => { currencyCalls += 1; return '140 Nickel'; },
  () => { reinforcementCalls += 1; return '+10 % Geschwindigkeit'; }
);
assert.deepEqual(incomplete, {
  timeText: '–',
  valueText: '–',
  damageText: '–',
  damageBaseInfo: '',
  speedText: '–',
  speedBaseInfo: '',
  hitText: '–',
  rawText: '–',
  penetrationText: '–',
  rarityText: '–',
  reinforcementText: 'Verstärkungseffekt: –',
  startDisabled: true
});
assert.equal(currencyCalls, 0);
assert.equal(reinforcementCalls, 0);

const ready = getForgePreviewPresentation(
  {
    complete: true,
    hasMaterials: true,
    hasCapacity: true,
    seconds: 42,
    valueNickel: 140,
    factor: 1.4,
    stats,
    reinforcementMaterial: 'Kupfer'
  },
  (value) => `${value} Nickel`,
  (material) => material === 'Kupfer' ? '+10 % Geschwindigkeit' : 'Kein Zusatzeffekt'
);
assert.deepEqual(ready, {
  timeText: '42 s',
  valueText: '140 Nickel',
  damageText: '12.35',
  damageBaseInfo: 'Materialbasis 10.00 × Waffenform 1.2',
  speedText: '1.23',
  speedBaseInfo: 'Materialbasis 1.10 × Waffenform 1.1',
  hitText: '78 %',
  rawText: '9.88',
  penetrationText: '25 %',
  rarityText: '× 1.4',
  reinforcementText: 'Verstärkungseffekt: +10 % Geschwindigkeit',
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

console.log('Forge-Presentation-Core: Schmiedevorschau, Formatierung und Startfreigabe sind konsistent.');
