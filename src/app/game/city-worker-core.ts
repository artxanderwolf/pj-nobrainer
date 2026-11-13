import { type CityBuildingInstance, type CityLayoutWorldState } from './city-layout-core.ts';
import { dungeonSessionActive } from './parallel-dungeon-core.ts';
import { type TeamWorldState } from './team-core.ts';

export const HELPER_SPEED_FACTOR = 1.2;
export type WorkerBuildingType = 'forge' | 'market';

export interface TimedProductionJob {
  jobId?: string;
  startedAt?: number;
  finishesAt?: number;
  totalSeconds?: number;
  seconds?: number;
  buildingInstanceId?: string;
  /** Remaining work at the last speed-change anchor, measured in unboosted seconds. */
  workRemainingSeconds?: number;
  workAnchorAt?: number;
  workSpeed?: number;
}
export interface CityWorkerWorldState extends CityLayoutWorldState, TeamWorldState {
  characters: Array<{ id: number; name?: string }>;
  forgeJobs: TimedProductionJob[];
  marketJobs: TimedProductionJob[];
}
export type WorkerAssignResult =
  | { ok: true; previousId: number | null }
  | { ok: false; reason: 'building' | 'character' | 'occupied' | 'dungeon' | 'team' };

function jobsOf(state: CityWorkerWorldState, type: WorkerBuildingType): TimedProductionJob[] {
  return type === 'forge' ? state.forgeJobs : state.marketJobs;
}
function operationalBuildings(state: CityWorkerWorldState, type: WorkerBuildingType): CityBuildingInstance[] {
  return (state.cityLayout?.buildings ?? []).filter(
    b => b.buildingTypeId === type && b.status === 'placed'
  ).sort((a,b) => Number(a.buildingInstanceId.slice(9)) - Number(b.buildingInstanceId.slice(9)));
}
export function workingCharacterIds(state: CityLayoutWorldState): Set<number> {
  return new Set((state.cityLayout?.buildings ?? [])
    .map(b => b.workerCharacterId).filter((id): id is number => id !== null));
}
export function characterInDungeonTeam(state: TeamWorldState, characterId: number): boolean {
  return Object.values(state.teams ?? {}).some(team =>
    [...team.dungeonTeamSlots, ...team.dungeonCycleOriginalIds, ...(team.dungeonRun?.participantIds ?? [])]
      .includes(characterId)
  );
}
export function characterInActiveDungeon(state: TeamWorldState, characterId: number): boolean {
  return Object.values(state.teams ?? {}).some(team => dungeonSessionActive(team) &&
    [...team.dungeonTeamSlots, ...team.dungeonCycleOriginalIds, ...(team.dungeonRun?.participantIds ?? [])]
      .includes(characterId)
  );
}

/** Import repair is intentionally conservative: reject invalid or double-booked employees. */
export function validateCityWorkers(state: CityWorkerWorldState): void {
  const used = new Set<number>();
  for (const b of state.cityLayout?.buildings ?? []) {
    if (b.workerCharacterId === null) continue;
    if ((b.buildingTypeId !== 'forge' && b.buildingTypeId !== 'market') || b.status !== 'placed')
      throw new Error('S16: Helfer an nicht betriebsfähigem Gebäude.');
    if (!state.characters.some(c => c.id === b.workerCharacterId) || used.has(b.workerCharacterId) ||
        characterInDungeonTeam(state, b.workerCharacterId)) {
      throw new Error('S16: Ungültige oder doppelte Helferzuordnung.');
    }
    used.add(b.workerCharacterId);
  }
}

export function assignCityWorker(
  state: CityWorkerWorldState, buildingInstanceId: string, characterId: number | null
): WorkerAssignResult {
  const building = (state.cityLayout?.buildings ?? []).find(b => b.buildingInstanceId === buildingInstanceId);
  if (!building || building.status !== 'placed' ||
      (building.buildingTypeId !== 'forge' && building.buildingTypeId !== 'market'))
    return { ok:false, reason:'building' };
  if (characterId !== null) {
    if (!Number.isSafeInteger(characterId) || !state.characters.some(c => c.id === characterId))
      return { ok:false, reason:'character' };
    if (characterInActiveDungeon(state,characterId)) return { ok:false, reason:'dungeon' };
    if (characterInDungeonTeam(state,characterId)) return { ok:false, reason:'team' };
    if (state.cityLayout?.buildings.some(other =>
      other.buildingInstanceId !== buildingInstanceId && other.workerCharacterId === characterId))
      return { ok:false, reason:'occupied' };
  }
  const previousId = building.workerCharacterId;
  building.workerCharacterId = characterId;
  return { ok:true, previousId };
}

/**
 * Snapshots are anchored only on reassignment; no 250ms state write is needed.
 * Previously completed base work is never discarded.
 */
export function setTimedJobSpeed(job: TimedProductionJob, nextSpeed: number, at: number): void {
  if (!Number.isFinite(nextSpeed) || nextSpeed <= 0 || !Number.isFinite(at))
    throw new Error('S16: Ungültige Produktionsgeschwindigkeit.');
  if (!Number.isFinite(job.finishesAt) || !Number.isFinite(job.startedAt)) return;
  const oldSpeed = Number.isFinite(job.workSpeed) && job.workSpeed! > 0 ? job.workSpeed! : 1;
  const oldAnchor = Number.isFinite(job.workAnchorAt) ? job.workAnchorAt! : job.startedAt!;
  const initialWork = Number.isFinite(job.workRemainingSeconds) && job.workRemainingSeconds! >= 0
    ? job.workRemainingSeconds!
    : Math.max(0,(job.finishesAt! - oldAnchor)/1000)*oldSpeed;
  const remaining = Math.max(0,initialWork-Math.max(0,at-oldAnchor)/1000*oldSpeed);
  job.workAnchorAt=at;
  job.workRemainingSeconds=remaining;
  job.workSpeed=nextSpeed;
  job.finishesAt=at + Math.ceil(remaining/nextSpeed*1000);
}
export function elapsedTimedJobWork(job: TimedProductionJob, now: number): number {
  const base = Math.max(0,Number(job.totalSeconds ?? job.seconds ?? 0));
  const remaining = Number.isFinite(job.workRemainingSeconds) && Number.isFinite(job.workAnchorAt)
    ? Math.max(0,job.workRemainingSeconds! - Math.max(0,now-job.workAnchorAt!)/1000*(job.workSpeed ?? 1))
    : Math.max(0,((job.finishesAt ?? now)-now)/1000);
  return base > 0 ? Math.min(base,base-remaining) : 0;
}

/**
 * Bind every active job deterministically to a *physical* operating building.
 * Called at actual queue-start timestamps, including S13 offline replay milestones.
 */
export function reconcileProductionAssignments(
  state: CityWorkerWorldState, type: WorkerBuildingType, at: number
): boolean {
  const buildings = operationalBuildings(state,type);
  const active = jobsOf(state,type);
  const valid = new Set(active.map(job=>job.jobId).filter((id): id is string=>!!id));
  let changed = false;
  for(const b of buildings){
    if(b.activeJobId !== null && !valid.has(b.activeJobId)){
      b.activeJobId=null;
      changed=true;
    }
  }
  const taken = new Set<string>();
  for(const job of active){
    const binding = buildings.find(b => b.buildingInstanceId === job.buildingInstanceId &&
      !taken.has(b.buildingInstanceId));
    if(!binding) continue;
    taken.add(binding.buildingInstanceId);
    if(binding.activeJobId !== job.jobId){binding.activeJobId=job.jobId ?? null;changed=true;}
  }
  for(const job of active) {
    const current=buildings.find(b=>b.buildingInstanceId===job.buildingInstanceId &&
      taken.has(b.buildingInstanceId) && b.activeJobId===job.jobId);
    if(current) {
      const expected=current.workerCharacterId===null?1:HELPER_SPEED_FACTOR;
      if(job.workSpeed !== expected){
        setTimedJobSpeed(job,expected,at);
        changed=true;
      }
      continue;
    }
    const free=buildings.find(b=>!taken.has(b.buildingInstanceId));
    if(!free) continue; // Legacy over-capacity work retains its original deadline.
    job.buildingInstanceId=free.buildingInstanceId;
    free.activeJobId=job.jobId ?? null;
    taken.add(free.buildingInstanceId);
    setTimedJobSpeed(job,free.workerCharacterId===null?1:HELPER_SPEED_FACTOR,at);
    changed=true;
  }
  return changed;
}
export function changeCityWorker(
  state: CityWorkerWorldState, buildingInstanceId: string, characterId: number | null, at: number
): WorkerAssignResult {
  const result=assignCityWorker(state,buildingInstanceId,characterId);
  if(!result.ok) return result;
  const building=state.cityLayout!.buildings.find(b=>b.buildingInstanceId===buildingInstanceId)!;
  reconcileProductionAssignments(state,building.buildingTypeId as WorkerBuildingType,at);
  return result;
}
