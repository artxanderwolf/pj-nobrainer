import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';

const sourceUrl = new URL('../src/app/game/forge-core.ts', import.meta.url);
const temporaryUrl = new URL('../src/app/game/forge-core.node-check.ts', import.meta.url);
const source = readFileSync(sourceUrl, 'utf8').replace("from './game-core';", "from './game-core.ts';");
writeFileSync(temporaryUrl, source, 'utf8');

try {
  const { forgeRequirements, hasForgeMaterials, reserveForgeMaterials, createForgeJob, enqueueForgeJob, advanceForgeJobs } = await import(`${temporaryUrl.href}?check=${Date.now()}`);
  const slots = [
    { slot: 'baseMaterial', material: 'Zinn' },
    { slot: 'blade', material: 'Zinn' },
    { slot: 'back', material: 'Zinn' },
    { slot: 'gripShape', material: 'Morsche Fichte' },
    { slot: 'gripMaterial', material: 'Lederfetzen' },
    { slot: 'reinforcementMaterial', material: 'Zinn' }
  ];
  const requirements = forgeRequirements(slots);
  assert.deepEqual(requirements, { Zinn: 4, 'Morsche Fichte': 1, Lederfetzen: 1 });
  const inventory = { Zinn: { category: 'Metall', qty: 4 }, 'Morsche Fichte': { category: 'Holz', qty: 2 }, Lederfetzen: { category: 'Leder', qty: 1 } };
  assert.equal(hasForgeMaterials(inventory, requirements), true);
  assert.equal(reserveForgeMaterials(inventory, requirements), true);
  assert.equal(inventory.Zinn, undefined);
  assert.equal(inventory['Morsche Fichte'].qty, 1);
  assert.equal(inventory.Lederfetzen, undefined);

  const job = createForgeJob('sword', '', slots);
  assert.equal(job.weaponName, 'Einhänder');
  assert.equal(job.totalSeconds, 30);
  assert.equal(job.valueNickel, 100);
  assert.equal(job.slots.length, 6);

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

  const parallel = { forgeJobs: [], forgeQueue: [] };
  enqueueForgeJob(parallel, { ...job, weaponName: 'P1' }, 2, 1, 5000);
  enqueueForgeJob(parallel, { ...job, weaponName: 'P2' }, 2, 1, 5000);
  enqueueForgeJob(parallel, { ...job, weaponName: 'Q1' }, 2, 1, 5000);
  const parallelDone = [];
  advanceForgeJobs(parallel, 2, 66000, (finished, at) => parallelDone.push([finished.weaponName, at]));
  assert.deepEqual(parallelDone, [['P1', 35000], ['P2', 35000], ['Q1', 65000]]);

  console.log('Forge-Core: Materialreservierung, Aufträge, Slots, Queue und Offline-Catch-up sind konsistent.');
} finally {
  unlinkSync(temporaryUrl);
}
