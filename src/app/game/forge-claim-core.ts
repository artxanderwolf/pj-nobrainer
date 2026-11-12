import { type ForgeJob, type ForgeStateLike, fillForgeSlots } from './forge-core.ts';

/** S14: persisted, stable manufacturing identity and non-running completed orders. */
export interface IdentifiedForgeJob extends ForgeJob { jobId: string; status: 'queued' | 'active' | 'ready' | 'claimed'; }
export interface ForgeClaimWorldState extends ForgeStateLike {
  forgeReadyJobs?: IdentifiedForgeJob[];
  nextForgeJobNumber?: number;
}
const JOB_ID = /^forge-job-([1-9][0-9]*)$/;

export function initializeForgeClaims(state: ForgeClaimWorldState): boolean {
  if (!Array.isArray(state.forgeJobs) || !Array.isArray(state.forgeQueue)) {
    throw new Error('S14: Schmiedeaufträge fehlen.');
  }
  let changed = false;
  if (!Array.isArray(state.forgeReadyJobs)) { state.forgeReadyJobs = []; changed = true; }
  const all = [...state.forgeJobs, ...state.forgeQueue, ...state.forgeReadyJobs];
  const used = new Set<string>();
  let maxNumber = 0;
  for (const job of all) {
    const id = (job as Partial<IdentifiedForgeJob>).jobId;
    if (id === undefined) continue;
    const m = typeof id === 'string' ? JOB_ID.exec(id) : null;
    if (!m || used.has(id)) throw new Error('S14: Ungültige oder doppelte Schmiedeauftrags-ID.');
    used.add(id);
    maxNumber = Math.max(maxNumber, Number(m[1]));
  }
  let counter = state.nextForgeJobNumber;
  if (counter === undefined) { counter = maxNumber + 1; changed = true; }
  if (!Number.isSafeInteger(counter) || counter <= maxNumber || counter < 1) {
    throw new Error('S14: Ungültiger Auftrags-ID-Zähler.');
  }
  const allocate = () => {
    if (!Number.isSafeInteger(counter! + 1)) throw new Error('S14: Schmiedeauftrags-Zähler erschöpft.');
    const value = `forge-job-${counter}`;
    counter!++;
    return value;
  };
  const groups: Array<[ForgeJob[], IdentifiedForgeJob['status']]> = [
    [state.forgeJobs, 'active'], [state.forgeQueue, 'queued'], [state.forgeReadyJobs, 'ready']
  ];
  for (const [jobs,status] of groups) {
    for (const job of jobs) {
      const identified = job as IdentifiedForgeJob;
      if (!identified.jobId) { identified.jobId = allocate(); changed = true; }
      if (identified.status !== status) { identified.status = status; changed = true; }
    }
  }
  if (state.nextForgeJobNumber !== counter) { state.nextForgeJobNumber = counter; changed = true; }
  return changed;
}

export function identifyNewForgeJob(state: ForgeClaimWorldState, job: ForgeJob): IdentifiedForgeJob {
  initializeForgeClaims(state);
  const n = state.nextForgeJobNumber!;
  if (!Number.isSafeInteger(n + 1)) throw new Error('S14: Keine weitere Schmiedeauftrags-ID verfügbar.');
  state.nextForgeJobNumber = n + 1;
  return Object.assign(job,{jobId:`forge-job-${n}`,status:'queued' as const});
}

/**
 * Complete all due work as ready, without producing inventory entries.
 * Ready orders continue to occupy total-order capacity, never an active building.
 * Actual completion timestamps are retained for offline queue scheduling.
 */
export function advanceForgeJobsToReady(
  state: ForgeClaimWorldState, activeSlots: number, now: number,
  onReady: (job: IdentifiedForgeJob, at: number) => void = () => {}
): number {
  initializeForgeClaims(state);
  let completed = 0;
  let guard = 0;
  while (guard++ < 10000) {
    const due = state.forgeJobs
      .filter(job => Number.isFinite(job.finishesAt) && Number(job.finishesAt) <= now)
      .sort((a,b)=>Number(a.finishesAt)-Number(b.finishesAt))[0];
    if (!due) break;
    const at = Number(due.finishesAt);
    const finished = state.forgeJobs.filter(job => Number(job.finishesAt) <= at) as IdentifiedForgeJob[];
    state.forgeJobs = state.forgeJobs.filter(job => Number(job.finishesAt) > at);
    for (const job of finished) {
      job.status = 'ready';
      state.forgeReadyJobs!.push(job);
      onReady(job,at);
    }
    completed += finished.length;
    const started = fillForgeSlots(state, activeSlots, at) as IdentifiedForgeJob[];
    for (const job of started) job.status = 'active';
  }
  const started = fillForgeSlots(state, activeSlots, now) as IdentifiedForgeJob[];
  for (const job of started) job.status = 'active';
  return completed;
}

/** Removes a ready job exactly once. Service performs inventory credit immediately thereafter. */
export function takeReadyForgeJob(state: ForgeClaimWorldState, jobId: string): IdentifiedForgeJob | null {
  initializeForgeClaims(state);
  const i = state.forgeReadyJobs!.findIndex(job=>job.jobId===jobId && job.status==='ready');
  if (i < 0) return null;
  const claimed = state.forgeReadyJobs!.splice(i,1)[0];
  claimed.status = 'claimed';
  return claimed;
}
