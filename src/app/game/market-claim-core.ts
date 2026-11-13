import { fillMarketSlots, type MarketJob, type MarketStateLike } from './market-core.ts';

/** Stable persisted market order identity; materialId and weaponSnapshot preserve stock ownership. */
export interface IdentifiedMarketJob extends MarketJob {
  jobId: string;
  status: 'queued' | 'active' | 'ready' | 'claimed';
}
export interface MarketClaimWorldState extends MarketStateLike {
  marketReadyJobs?: IdentifiedMarketJob[];
  nextMarketJobNumber?: number;
}
const ID_PATTERN = /^market-job-([1-9][0-9]*)$/;

/** One-time, idempotent Save21 -> Save22 transition, without altering reservations or timestamps. */
export function initializeMarketClaims(state: MarketClaimWorldState): boolean {
  if (!Array.isArray(state.marketJobs) || !Array.isArray(state.marketQueue)) {
    throw new Error('S15: Marktaufträge fehlen.');
  }
  let changed = false;
  if (!Array.isArray(state.marketReadyJobs)) { state.marketReadyJobs = []; changed = true; }
  const groups: Array<[MarketJob[], IdentifiedMarketJob['status']]> = [
    [state.marketJobs, 'active'], [state.marketQueue, 'queued'], [state.marketReadyJobs, 'ready']
  ];
  const ids = new Set<string>();
  let maximum = 0;
  for (const [jobs] of groups) {
    for (const job of jobs) {
      const id = (job as Partial<IdentifiedMarketJob>).jobId;
      if (id === undefined) continue;
      const match = typeof id === 'string' ? ID_PATTERN.exec(id) : null;
      if (!match || ids.has(id) || !Number.isSafeInteger(Number(match[1]))) {
        throw new Error('S15: Doppelte oder ungültige Marktauftrags-ID.');
      }
      ids.add(id);
      maximum = Math.max(maximum, Number(match[1]));
    }
  }
  let counter = state.nextMarketJobNumber;
  if (counter === undefined) { counter = maximum + 1; changed = true; }
  if (!Number.isSafeInteger(counter) || counter <= maximum || counter < 1) {
    throw new Error('S15: Ungültiger Marktauftragszähler.');
  }
  for (const [jobs, status] of groups) {
    for (const job of jobs) {
      const identified = job as IdentifiedMarketJob;
      if (identified.jobId === undefined) {
        if (!Number.isSafeInteger(counter + 1)) throw new Error('S15: Marktauftragszähler erschöpft.');
        identified.jobId = `market-job-${counter++}`;
        changed = true;
      }
      if (identified.status !== status) { identified.status = status; changed = true; }
    }
  }
  if (state.nextMarketJobNumber !== counter) { state.nextMarketJobNumber = counter; changed = true; }
  return changed;
}

export function identifyNewMarketJob(state: MarketClaimWorldState, job: MarketJob): IdentifiedMarketJob {
  initializeMarketClaims(state);
  const id = state.nextMarketJobNumber!;
  if (!Number.isSafeInteger(id + 1)) throw new Error('S15: Marktauftragszähler erschöpft.');
  state.nextMarketJobNumber = id + 1;
  return Object.assign(job, { jobId: `market-job-${id}`, status: 'queued' as const });
}

/**
 * Completion moves into ready without minting Nickel.
 * Queued orders are dispatched at their true historical start times.
 */
export function advanceMarketJobsToReady(
  state: MarketClaimWorldState,
  activeSlots: number,
  now: number,
  onReady: (job: IdentifiedMarketJob, at: number) => void = () => {},
  onStart: (job: IdentifiedMarketJob, at: number) => void = () => {}
): number {
  initializeMarketClaims(state);
  let completed = 0;
  let guard = 0;
  while (guard++ < 10000) {
    const due = state.marketJobs
      .filter(job => Number.isFinite(job.finishesAt) && Number(job.finishesAt) <= now)
      .sort((a, b) => Number(a.finishesAt) - Number(b.finishesAt))[0];
    if (!due) break;
    const at = Number(due.finishesAt);
    const finished = state.marketJobs.filter(job => Number(job.finishesAt) <= at) as IdentifiedMarketJob[];
    state.marketJobs = state.marketJobs.filter(job => Number(job.finishesAt) > at);
    for (const job of finished) {
      job.status = 'ready';
      state.marketReadyJobs!.push(job);
      onReady(job, at);
    }
    completed += finished.length;
    for (const job of fillMarketSlots(state, activeSlots, at) as IdentifiedMarketJob[]) {
      job.status = 'active';
      onStart(job,at);
    }
  }
  for (const job of fillMarketSlots(state, activeSlots, now) as IdentifiedMarketJob[]) {
    job.status = 'active';
    onStart(job,now);
  }
  return completed;
}

/** Only completed and unpaid sales can be claimed. Never returns goods to inventory. */
export function takeReadyMarketJob(state: MarketClaimWorldState, jobId: string): IdentifiedMarketJob | null {
  initializeMarketClaims(state);
  const index = state.marketReadyJobs!.findIndex(job => job.jobId === jobId && job.status === 'ready');
  if (index < 0) return null;
  const claimed = state.marketReadyJobs!.splice(index, 1)[0];
  claimed.status = 'claimed';
  return claimed;
}
