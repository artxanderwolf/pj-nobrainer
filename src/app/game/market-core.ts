export interface MarketJob {
  type: 'material' | 'weapon';
  name: string;
  valueNickel: number;
  seconds: number;
  quantity?: number;
  unitValueNickel?: number;
  unitSeconds?: number;
  weaponId?: number;
  weaponSnapshot?: unknown;
  startedAt?: number;
  finishesAt?: number;
}

export interface MarketStateLike {
  marketJobs: MarketJob[];
  marketQueue: MarketJob[];
}

export function hasMarketCapacity(state: MarketStateLike, activeSlots: number, queueSlots: number): boolean {
  return state.marketJobs.length + state.marketQueue.length < Math.max(0, activeSlots) + Math.max(0, queueSlots);
}

export function startMarketQueuedJob(job: MarketJob, at: number): MarketJob {
  job.startedAt = at;
  job.finishesAt = at + job.seconds * 1000;
  return job;
}

export function fillMarketSlots(state: MarketStateLike, activeSlots: number, at: number): MarketJob[] {
  const started: MarketJob[] = [];
  while (state.marketJobs.length < Math.max(0, activeSlots) && state.marketQueue.length) {
    const job = state.marketQueue.shift();
    if (!job) break;
    startMarketQueuedJob(job, at);
    state.marketJobs.push(job);
    started.push(job);
  }
  return started;
}

export function enqueueMarketJob(state: MarketStateLike, job: MarketJob, activeSlots: number, queueSlots: number, at: number): 'started' | 'queued' | 'full' {
  if (!hasMarketCapacity(state, activeSlots, queueSlots)) return 'full';
  if (state.marketJobs.length < Math.max(0, activeSlots)) {
    startMarketQueuedJob(job, at);
    state.marketJobs.push(job);
    return 'started';
  }
  state.marketQueue.push(job);
  return 'queued';
}

export function advanceMarketJobs(state: MarketStateLike, activeSlots: number, now: number, onComplete: (job: MarketJob, at: number) => void): number {
  let completed = 0;
  let guard = 0;
  while (guard++ < 10000) {
    const next = state.marketJobs
      .filter((job) => Number.isFinite(job.finishesAt) && Number(job.finishesAt) <= now)
      .sort((a, b) => Number(a.finishesAt) - Number(b.finishesAt))[0];
    if (!next) break;
    const at = Number(next.finishesAt);
    const done = state.marketJobs.filter((job) => Number(job.finishesAt) <= at);
    for (const job of done) onComplete(job, at);
    completed += done.length;
    state.marketJobs = state.marketJobs.filter((job) => Number(job.finishesAt) > at);
    fillMarketSlots(state, activeSlots, at);
  }
  fillMarketSlots(state, activeSlots, now);
  return completed;
}

export function cancelMarketJob(state: MarketStateLike, kind: 'active' | 'queue', index: number, activeSlots: number, at: number): MarketJob | null {
  const jobs = kind === 'queue' ? state.marketQueue : state.marketJobs;
  const job = jobs[index];
  if (!job) return null;
  jobs.splice(index, 1);
  if (kind === 'active') fillMarketSlots(state, activeSlots, at);
  return job;
}

export const MARKET_CORE_BRIDGE = {
  hasMarketCapacity,
  startMarketQueuedJob,
  fillMarketSlots,
  enqueueMarketJob,
  advanceMarketJobs,
  cancelMarketJob
};

export type MarketCoreBridge = typeof MARKET_CORE_BRIDGE;
