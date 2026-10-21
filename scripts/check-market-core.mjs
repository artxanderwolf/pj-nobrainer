import assert from 'node:assert/strict';
import {
  advanceMarketJobs,
  cancelMarketJob,
  enqueueMarketJob,
  hasMarketCapacity,
  normalizeMarketMaterialJob,
  normalizeMarketMaterialJobs
} from '../src/app/game/market-core.ts';

function materialJob(materialId, seconds = 10, valueNickel = 100) {
  return { type: 'material', materialId, seconds, valueNickel, quantity: 1 };
}
function weaponJob(name, seconds = 10, valueNickel = 100) {
  return { type: 'weapon', name, seconds, valueNickel, quantity: 1 };
}

{
  const legacy = { type: 'material', name: 'Fichte', seconds: 10, valueNickel: 100, quantity: 1 };
  assert.equal(normalizeMarketMaterialJob(legacy), true);
  assert.equal(legacy.materialId, 2);
  assert.equal('name' in legacy, false, 'Migrierte Materialaufträge dürfen keinen Anzeigenamen persistieren.');
  assert.equal(normalizeMarketMaterialJob(legacy), false, 'Markt-Migration muss idempotent sein.');

  const idWithLegacyName = { ...materialJob(4), name: 'Zinn' };
  assert.equal(normalizeMarketMaterialJob(idWithLegacyName), true);
  assert.equal(idWithLegacyName.materialId, 4);
  assert.equal('name' in idWithLegacyName, false);

  assert.throws(
    () => normalizeMarketMaterialJob({ type: 'material', name: 'Fichte', materialId: 4, seconds: 10, valueNickel: 100 }),
    /Widersprüchliche Materialreferenz/,
    'Bekannter Name und fremde Material-ID dürfen nicht stillschweigend akzeptiert werden.'
  );

  const migrationState = {
    marketJobs: [{ type: 'material', name: 'Kupfer', seconds: 10, valueNickel: 100 }],
    marketQueue: [{ type: 'material', name: 'Lederfetzen', seconds: 10, valueNickel: 100 }]
  };
  assert.equal(normalizeMarketMaterialJobs(migrationState), 2);
  assert.deepEqual(migrationState.marketJobs, [{ type: 'material', seconds: 10, valueNickel: 100, materialId: 5 }]);
  assert.deepEqual(migrationState.marketQueue, [{ type: 'material', seconds: 10, valueNickel: 100, materialId: 9 }]);
}

{
  const state = { marketJobs: [], marketQueue: [] };
  assert.equal(hasMarketCapacity(state, 1, 1), true);
  assert.equal(enqueueMarketJob(state, materialJob(2), 1, 1, 1000), 'started');
  assert.equal(state.marketJobs[0].finishesAt, 11000);
  assert.equal(enqueueMarketJob(state, materialJob(4), 1, 1, 1000), 'queued');
  assert.equal(enqueueMarketJob(state, materialJob(5), 1, 1, 1000), 'full');
  assert.equal(hasMarketCapacity(state, 1, 1), false);
  assert.equal(state.marketJobs[0].name, undefined, 'Neue Materialaufträge bleiben ID-only.');
}

{
  const state = { marketJobs: [], marketQueue: [] };
  enqueueMarketJob(state, weaponJob('A', 10), 2, 2, 0);
  enqueueMarketJob(state, weaponJob('B', 20), 2, 2, 0);
  enqueueMarketJob(state, weaponJob('C', 5), 2, 2, 0);
  const completed = [];
  assert.equal(advanceMarketJobs(state, 2, 10000, (j, at) => completed.push([j.name, at])), 1);
  assert.deepEqual(completed, [['A', 10000]]);
  assert.equal(state.marketJobs.some((j) => j.name === 'C' && j.startedAt === 10000 && j.finishesAt === 15000), true);
}

{
  const state = { marketJobs: [], marketQueue: [] };
  enqueueMarketJob(state, weaponJob('A', 10), 1, 3, 0);
  enqueueMarketJob(state, weaponJob('B', 10), 1, 3, 0);
  enqueueMarketJob(state, weaponJob('C', 10), 1, 3, 0);
  const completed = [];
  assert.equal(advanceMarketJobs(state, 1, 35000, (j, at) => completed.push([j.name, at])), 3);
  assert.deepEqual(completed, [['A', 10000], ['B', 20000], ['C', 30000]]);
  assert.equal(state.marketJobs.length, 0);
  assert.equal(state.marketQueue.length, 0);
}

{
  const state = { marketJobs: [], marketQueue: [] };
  const a = weaponJob('A', 10); const b = weaponJob('B', 10);
  enqueueMarketJob(state, a, 1, 2, 0);
  enqueueMarketJob(state, b, 1, 2, 0);
  assert.equal(cancelMarketJob(state, 'active', 0, 1, 5000)?.name, 'A');
  assert.equal(state.marketJobs[0].name, 'B');
  assert.equal(state.marketJobs[0].startedAt, 5000);
  assert.equal(state.marketJobs[0].finishesAt, 15000);
}

{
  const state = { marketJobs: [], marketQueue: [] };
  enqueueMarketJob(state, weaponJob('A'), 1, 2, 0);
  enqueueMarketJob(state, weaponJob('B'), 1, 2, 0);
  assert.equal(cancelMarketJob(state, 'queue', 0, 1, 5000)?.name, 'B');
  assert.equal(state.marketJobs[0].name, 'A');
  assert.equal(state.marketQueue.length, 0);
}

console.log('Market Core checks passed: Materialaufträge persistieren IDs, Queue-Ablauf bleibt konsistent.');
