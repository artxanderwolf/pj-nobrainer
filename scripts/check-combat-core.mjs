import assert from 'node:assert/strict';
import { applyAttackDamage, buildWeightedTargets, targetWeight } from '../src/app/game/combat-core.ts';

assert.equal(targetWeight(1), 1);
assert.equal(targetWeight(2), 0.5);
assert.equal(targetWeight(4), 0.25);

const targets = [
  { id: 'fighter', hp: 35, alive: true, distance: 1 },
  { id: 'recruit', hp: 30, alive: true, distance: 2 },
  { id: 'scholar', hp: 22, alive: true, distance: 4 },
  { id: 'down', hp: 0, alive: false, distance: 1 }
];
const weighted = buildWeightedTargets(targets);
assert.deepEqual(weighted.map(entry => [entry.target.id, entry.weight]), [
  ['fighter', 1],
  ['recruit', 0.5],
  ['scholar', 0.25]
]);

const armored = { hp: 30, alive: true, armor: 10 };
assert.equal(applyAttackDamage(armored, 20, 0), 10);
assert.equal(armored.hp, 20);
assert.equal(armored.alive, true);

const penetrated = { hp: 30, alive: true, armor: 10 };
assert.equal(applyAttackDamage(penetrated, 20, 0.5), 15);
assert.equal(penetrated.hp, 15);

const defeated = { hp: 5, alive: true, armor: 0 };
assert.equal(applyAttackDamage(defeated, 8, 0), 8);
assert.equal(defeated.hp, 0);
assert.equal(defeated.alive, false);

const blocked = { hp: 10, alive: true, armor: 20 };
assert.equal(applyAttackDamage(blocked, 5, 0), 0);
assert.equal(blocked.hp, 10);

console.log('Combat-Core: Zielgewichtung, Rüstung, Durchschlag und HP-Status sind konsistent.');
