import assert from 'node:assert/strict';
import { applyAttackDamage, buildWeightedTargets, resolveAttack, targetWeight } from '../src/app/game/combat-core.ts';

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

const missed = { hp: 20, alive: true, armor: 0, dodge: 0.25 };
assert.deepEqual(resolveAttack(missed, 10, 0.5, 0, 0.5, 0.9), { outcome: 'miss' });
assert.equal(missed.hp, 20);

const dodged = { hp: 20, alive: true, armor: 0, dodge: 0.25 };
assert.deepEqual(resolveAttack(dodged, 10, 0.5, 0, 0.49, 0.24), { outcome: 'dodge' });
assert.equal(dodged.hp, 20);

const hit = { hp: 20, alive: true, armor: 2, dodge: 0.25 };
assert.deepEqual(resolveAttack(hit, 10, 0.5, 0, 0.49, 0.25), { outcome: 'hit', dealt: 8 });
assert.equal(hit.hp, 12);

const clampedChance = { hp: 20, alive: true, armor: 0, dodge: 0 };
assert.equal(resolveAttack(clampedChance, 5, 2, 0, 0.99, 0.99).outcome, 'hit');

console.log('Combat-Core: Zielgewichtung, Treffer, Ausweichen, Rüstung, Durchschlag und HP-Status sind konsistent.');
