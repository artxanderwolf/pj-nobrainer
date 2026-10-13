import assert from 'node:assert/strict';
import { advanceMarketJobs, cancelMarketJob, enqueueMarketJob, hasMarketCapacity } from '../src/app/game/market-core.ts';

function job(name, seconds = 10, valueNickel = 100) {
  return { type: 'material', name, seconds, valueNickel, quantity: 1 };
}

{
  const state = { marketJobs: [], marketQueue: [] };
  assert.equal(hasMarketCapacity(state, 1, 1), true);
  assert.equal(enqueueMarketJob(state, job('A'), 1, 1, 1000), 'started');
  assert.equal(state.marketJobs[0].finishesAt, 11000);
  assert.equal(enqueueMarketJob(state, job('B'), 1, 1, 1000), 'queued');
  assert.equal(enqueueMarketJob(state, job('C'), 1, 1, 1000), 'full');
  assert.equal(hasMarketCapacity(state, 1, 1), false);
}

{
  const state = { marketJobs: [], marketQueue: [] };
  enqueueMarketJob(state, job('A', 10), 2, 2, 0);
  enqueueMarketJob(state, job('B', 20), 2, 2, 0);
  enqueueMarketJob(state, job('C', 5), 2, 2, 0);
  const completed = [];
  assert.equal(advanceMarketJobs(state, 2, 10000, (j, at) => completed.push([j.name, at])), 1);
  assert.deepEqual(completed, [['A', 10000]]);
  assert.equal(state.marketJobs.some((j) => j.name === 'C' && j.startedAt === 10000 && j.finishesAt === 15000), true);
}

{
  const state = { marketJobs: [], marketQueue: [] };
  enqueueMarketJob(state, job('A', 10), 1, 3, 0);
  enqueueMarketJob(state, job('B', 10), 1, 3, 0);
  enqueueMarketJob(state, job('C', 10), 1, 3, 0);
  const completed = [];
  assert.equal(advanceMarketJobs(state, 1, 35000, (j, at) => completed.push([j.name, at])), 3);
  assert.deepEqual(completed, [['A', 10000], ['B', 20000], ['C', 30000]]);
  assert.equal(state.marketJobs.length, 0);
  assert.equal(state.marketQueue.length, 0);
}

{
  const state = { marketJobs: [], marketQueue: [] };
  const a = job('A', 10); const b = job('B', 10);
  enqueueMarketJob(state, a, 1, 2, 0);
  enqueueMarketJob(state, b, 1, 2, 0);
  assert.equal(cancelMarketJob(state, 'active', 0, 1, 5000)?.name, 'A');
  assert.equal(state.marketJobs[0].name, 'B');
  assert.equal(state.marketJobs[0].startedAt, 5000);
  assert.equal(state.marketJobs[0].finishesAt, 15000);
}

{
  const state = { marketJobs: [], marketQueue: [] };
  enqueueMarketJob(state, job('A'), 1, 2, 0);
  enqueueMarketJob(state, job('B'), 1, 2, 0);
  assert.equal(cancelMarketJob(state, 'queue', 0, 1, 5000)?.name, 'B');
  assert.equal(state.marketJobs[0].name, 'A');
  assert.equal(state.marketQueue.length, 0);
}

console.log('Market Core checks passed.');
