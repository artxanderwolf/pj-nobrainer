import { getMaterialIdByName, getMaterialReferenceById } from './game-core.ts';

export interface MarketJob {
  type: 'material' | 'weapon';
  /** Waffenname oder Legacy-Migrationsquelle alter Materialaufträge; Materialaufträge persistieren den Namen nicht. */
  name?: string;
  /** Kanonische Referenz für Materialverkäufe; bei Waffen nicht gesetzt. */
  materialId?: number;
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

/** Migriert alte Materialnamen einmalig und hält Materialaufträge danach ausschließlich ID-basiert. */
export function normalizeMarketMaterialJob(job: MarketJob): boolean {
  if (job.type !== 'material') return false;

  const referenceById = getMaterialReferenceById(job.materialId);
  const legacyName = typeof job.name === 'string' && job.name ? job.name : null;
  const materialIdByName = getMaterialIdByName(legacyName);
  if (referenceById && materialIdByName !== null && materialIdByName !== referenceById.materialId) {
    throw new Error(
      `Widersprüchliche Materialreferenz im Marktauftrag: ${legacyName} verweist auf ID ${materialIdByName}, ` +
      `der Auftrag auf ID ${referenceById.materialId}.`
    );
  }

  const reference = referenceById ?? getMaterialReferenceById(materialIdByName);
  if (!reference) return false;

  let changed = false;
  if (job.materialId !== reference.materialId) {
    job.materialId = reference.materialId;
    changed = true;
  }
  if (job.name !== undefined) {
    delete job.name;
    changed = true;
  }
  return changed;
}

export function normalizeMarketMaterialJobs(state: MarketStateLike): number {
  let changed = 0;
  for (const job of [...state.marketJobs, ...state.marketQueue]) {
    if (normalizeMarketMaterialJob(job)) changed += 1;
  }
  return changed;
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
  normalizeMarketMaterialJob,
  normalizeMarketMaterialJobs,
  hasMarketCapacity,
  startMarketQueuedJob,
  fillMarketSlots,
  enqueueMarketJob,
  advanceMarketJobs,
  cancelMarketJob
};

export type MarketCoreBridge = typeof MARKET_CORE_BRIDGE;
