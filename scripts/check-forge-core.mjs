import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';

const sourceUrl = new URL('../src/app/game/forge-core.ts', import.meta.url);
const temporaryUrl = new URL('../src/app/game/forge-core.node-check.ts', import.meta.url);
const source = readFileSync(sourceUrl, 'utf8').replace("from './game-core';", "from './game-core.ts';");
writeFileSync(temporaryUrl, source, 'utf8');

try {
  const {
    forgeRequirements,
    getForgeSelectionQuantities,
    hasForgeMaterials,
    reserveForgeMaterials,
    createForgeJob,
    enqueueForgeJob,
    advanceForgeJobs
  } = await import(`${temporaryUrl.href}?check=${Date.now()}`);

  const slots = [
    { slot: 'workingPart', material: 'Zinn' },
    { slot: 'back', material: 'Zinn' },
    { slot: 'gripCore', material: 'Fichte' },
    { slot: 'gripWrap', material: 'Lederfetzen' },
    { slot: 'special', material: 'Fichte' }
  ];

  assert.deepEqual(getForgeSelectionQuantities('dagger'), { workingPart: 1, back: 1, gripCore: 1, gripWrap: 1, special: 1 });
  assert.deepEqual(getForgeSelectionQuantities('sword'), { workingPart: 3, back: 2, gripCore: 2, gripWrap: 1, special: 1 });
  assert.deepEqual(forgeRequirements(slots, 'dagger'), { Zinn: 2, Fichte: 2, Lederfetzen: 1 }, 'Dolch muss genau fünf Materialeinheiten benötigen.');
  assert.deepEqual(forgeRequirements(slots, 'sword'), { Zinn: 5, Fichte: 3, Lederfetzen: 1 }, 'Einhänder muss genau neun Materialeinheiten benötigen.');

  const inventory = { Zinn: { category: 'Metall', qty: 5 }, Fichte: { category: 'Holz', qty: 4 }, Lederfetzen: { category: 'Leder', qty: 1 } };
  const swordRequirements = forgeRequirements(slots, 'sword');
  assert.equal(hasForgeMaterials(inventory, swordRequirements), true);
  assert.equal(reserveForgeMaterials(inventory, swordRequirements), true);
  assert.equal(inventory.Zinn, undefined);
  assert.equal(inventory.Fichte.qty, 1);
  assert.equal(inventory.Lederfetzen, undefined);

  const legacySlots = [
    { slot: 'baseMaterial', material: 'Aluminium' },
    { slot: 'blade', material: 'Zinn' },
    { slot: 'back', material: 'Zinn' },
    { slot: 'gripShape', material: 'Fichte' },
    { slot: 'gripMaterial', material: 'Lederfetzen' },
    { slot: 'reinforcementMaterial', material: 'Fichte' }
  ];
  assert.deepEqual(forgeRequirements(legacySlots, 'sword'), swordRequirements, 'Altes Grundmaterial darf keinen Materialbedarf mehr erzeugen.');

  const job = createForgeJob('sword', '', legacySlots);
  assert.equal(job.weaponName, 'Einhänder');
  assert.equal(job.totalSeconds, 30);
  assert.equal(job.valueNickel, 100);
  assert.deepEqual(job.slots.map(slot => slot.slot), ['workingPart', 'back', 'gripCore', 'gripWrap', 'special'], 'Neue Waffen speichern nur die fünf semantischen Materialauswahlen.');
  assert.equal(job.slots.some(slot => slot.slot === 'baseMaterial'), false);

  const state = { forgeJobs: [], forgeQueue: [] };
  assert.equal(enqueueForgeJob(state, { ...job, weaponName: 'A' }, 1, 2, 1000), 'started');
  assert.equal(enqueueForgeJob(state, { ...job, weaponName: 'B' }, 1, 2, 1000), 'queued');
  assert.equal(enqueueForgeJob(state, { ...job, weaponName: 'C' }, 1, 2, 1000), 'queued');
  assert.equal(enqueueForgeJob(state, { ...job, weaponName: 'D' }, 1, 2, 1000), 'full');
  assert.equal(state.forgeJobs[0].finishesAt, 31000);

  const completed = [];
  const count = advanceForgeJobs(state, 1, 92000, (finished, at) => completed.push([finished.weaponName, at]));
  assert.equal(count, 3);
  assert.deepEqual(completed, [['A', 31000], ['B', 61000], ['C', 91000]]);
  assert.equal(state.forgeJobs.length, 0);
  assert.equal(state.forgeQueue.length, 0);

  console.log('Forge-Core: Blueprint-Materialmengen, Reservierung, Aufträge, Queue und Offline-Catch-up sind konsistent.');
} finally {
  unlinkSync(temporaryUrl);
}
