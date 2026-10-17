import assert from 'node:assert/strict';
import { MAX_ARMOR_PERCENT, resolveArmor } from '../src/app/game/armor-core.ts';
import { applyAttackDamage, buildWeightedTargets, enforceGlobalActionCooldown, resolveAttack, targetWeight } from '../src/app/game/combat-core.ts';

assert.equal(MAX_ARMOR_PERCENT, 80);
assert.deepEqual(resolveArmor(100, 0), { armor: 80, penetration: 0, effectiveArmor: 80, reduction: 0.8 });
assert.deepEqual(resolveArmor(80, 0.25), { armor: 80, penetration: 0.25, effectiveArmor: 60, reduction: 0.6 });

assert.equal(targetWeight(100), 100);
assert.equal(targetWeight(50), 50);
assert.equal(targetWeight(25), 25);

const targets = [
  { id: 'fighter', hp: 35, alive: true, threat: 100 },
  { id: 'recruit', hp: 30, alive: true, threat: 50 },
  { id: 'scholar', hp: 22, alive: true, threat: 25 },
  { id: 'down', hp: 0, alive: false, threat: 100 }
];
const weighted = buildWeightedTargets(targets);
assert.deepEqual(weighted.map(entry => [entry.target.id, entry.weight]), [
  ['fighter', 100],
  ['recruit', 50],
  ['scholar', 25]
]);

const fallbackWeighted = buildWeightedTargets([{ id: 'unknown', hp: 1, alive: true }], () => 33);
assert.equal(fallbackWeighted[0].weight, 33);

const armored = { hp: 30, alive: true, armor: 10 };
assert.equal(applyAttackDamage(armored, 20, 0), 18);
assert.equal(armored.hp, 12);
assert.equal(armored.alive, true);

const penetrated = { hp: 30, alive: true, armor: 10 };
assert.equal(applyAttackDamage(penetrated, 20, 0.5), 19);
assert.equal(penetrated.hp, 11);

const overriddenArmor = { hp: 30, alive: true, armor: 20 };
assert.equal(applyAttackDamage(overriddenArmor, 20, 0, 5), 19);
assert.equal(overriddenArmor.hp, 11);

const defeated = { hp: 5, alive: true, armor: 0 };
assert.equal(applyAttackDamage(defeated, 8, 0), 8);
assert.equal(defeated.hp, 0);
assert.equal(defeated.alive, false);

const capped = { hp: 20, alive: true, armor: 100 };
assert.equal(applyAttackDamage(capped, 10, 0), 2);
assert.equal(capped.hp, 18);

const capWithPenetration = { hp: 20, alive: true, armor: 100 };
assert.equal(applyAttackDamage(capWithPenetration, 10, 0.25), 4);
assert.equal(capWithPenetration.hp, 16);

const missed = { hp: 20, alive: true, armor: 0, dodge: 0.25 };
assert.deepEqual(resolveAttack(missed, 10, 0.5, 0, 0.5, 0.9), { outcome: 'miss' });
assert.equal(missed.hp, 20);

const dodged = { hp: 20, alive: true, armor: 0, dodge: 0.25 };
assert.deepEqual(resolveAttack(dodged, 10, 0.5, 0, 0.49, 0.24), { outcome: 'dodge' });
assert.equal(dodged.hp, 20);

const hit = { hp: 20, alive: true, armor: 2, dodge: 0.25 };
assert.deepEqual(resolveAttack(hit, 10, 0.5, 0, 0.49, 0.25), { outcome: 'hit', dealt: 9.8, critical: false });
assert.equal(hit.hp, 10.2);

const criticalTarget = { hp: 30, alive: true, armor: 0, dodge: 0 };
assert.deepEqual(
  resolveAttack(criticalTarget, 10, 1, 0, 0, 1, { critChance: 0.25, critDamage: 1.5, critRoll: 0.1 }),
  { outcome: 'hit', dealt: 15, critical: true }
);
assert.equal(criticalTarget.hp, 15);

const overriddenDodge = { hp: 20, alive: true, armor: 0, dodge: 0.9 };
assert.equal(resolveAttack(overriddenDodge, 5, 1, 0, 0, 0.5, { dodge: 0 }).outcome, 'hit');

const clampedChance = { hp: 20, alive: true, armor: 0, dodge: 0 };
assert.equal(resolveAttack(clampedChance, 5, 2, 0, 0.99, 0.99).outcome, 'hit');

const actionPoints = [{ id: 'player', nextAt: 1800 }, { id: 'enemy', nextAt: 2250 }, { id: 'later', nextAt: 4000 }];
enforceGlobalActionCooldown(actionPoints, 1000);
assert.deepEqual(actionPoints.map(point => point.nextAt), [2000, 2450, 4200]);
assert.deepEqual([...actionPoints].sort((a, b) => a.nextAt - b.nextAt).map(point => point.id), ['player', 'enemy', 'later']);

const noShiftNeeded = [{ nextAt: 5000 }, { nextAt: 5600 }];
enforceGlobalActionCooldown(noShiftNeeded, 3000);
assert.deepEqual(noShiftNeeded.map(point => point.nextAt), [5000, 5600]);

const fairness = [{ id: 'player', nextAt: 1900 }, { id: 'enemy', nextAt: 1250 }];
enforceGlobalActionCooldown(fairness, 900);
assert.deepEqual(fairness.map(point => point.nextAt), [2550, 1900]);
assert.equal([...fairness].sort((a, b) => a.nextAt - b.nextAt)[0].id, 'enemy');

console.log('Combat-Core: Bedrohungsgewichtung, Treffer/Ausweichen, prozentuale Rüstung mit 80%-Cap, DS, Krits und globales 1-Sekunden-Intervall sind konsistent.');
