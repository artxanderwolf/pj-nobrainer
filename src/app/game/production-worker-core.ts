import { type CityBuildingInstance, type CityLayoutWorldState } from './city-layout-core.ts';
import { characterTeamReservation, type TeamWorldState } from './team-core.ts';

export type ProductionKind = 'forge' | 'market';
export interface ProductionJob {
  jobId: string;
  status: 'queued' | 'active' | 'ready' | 'claimed';
  startedAt?: number;
  finishesAt?: number;
  buildingInstanceId?: string;
  /** Work in seconds, independent of the helper's speed. */
  remainingWorkSeconds?: number;
  /** Multiplier at which the current deadline was computed. */
  workRate?: number;
}
export interface ProductionWorkerWorld extends CityLayoutWorldState, TeamWorldState {
  characters: Array<{ id: number; name?: string }>;
  forgeJobs: ProductionJob[];
  forgeQueue: ProductionJob[];
  marketJobs: ProductionJob[];
  marketQueue: ProductionJob[];
  forgeReadyJobs?: ProductionJob[];
  marketReadyJobs?: ProductionJob[];
}
export type AssignmentOutcome = 'assigned' | 'unchanged' | 'invalid-building' | 'invalid-character' | 'occupied';

export const PRODUCTION_HELPER_SPEED = 1.2;
const FORGE_MINIMUM_SECONDS: Readonly<Record<string, number>> = {
  dagger: 20, sword: 45, axe1h: 45, sword2h: 75, axe2h: 75, bow: 90, staff: 50
};
export function minimumForgeSeconds(form: string, economySeconds: number): number {
  return Math.max(FORGE_MINIMUM_SECONDS[form] ?? 0, economySeconds);
}
export function operatingBuildings(state: CityLayoutWorldState, kind: ProductionKind): CityBuildingInstance[] {
  return (state.cityLayout?.buildings ?? []).filter(building => building.buildingTypeId === kind && building.status === 'placed')
    .sort((a,b)=>a.buildingInstanceId.localeCompare(b.buildingInstanceId,undefined,{numeric:true}));
}
export function productionRate(building: CityBuildingInstance): number {
  return building.workerCharacterId === null ? 1 : PRODUCTION_HELPER_SPEED;
}
export function isProductionWorkerReserved(state: CityLayoutWorldState, characterId: number, exceptBuilding?: string): boolean {
  return (state.cityLayout?.buildings ?? []).some(b =>
    b.buildingInstanceId !== exceptBuilding && b.workerCharacterId === characterId);
}
/** Selected characters may still be idle; active dungeon jobs alone reserve characters. */
export function mayWorkInBuilding(state: ProductionWorkerWorld, buildingId: string, characterId: number): boolean {
  return state.characters.some(c=>c.id===characterId) &&
    !isProductionWorkerReserved(state,characterId,buildingId) &&
    characterTeamReservation(state,characterId) === null;
}
export function validateWorkerAssignments(state: ProductionWorkerWorld): boolean {
  let changed=false;
  const seen=new Set<number>();
  for (const building of state.cityLayout?.buildings ?? []) {
    const characterId=building.workerCharacterId;
    if (characterId===null) continue;
    const valid=(building.buildingTypeId==='forge'||building.buildingTypeId==='market') &&
      building.status==='placed' && state.characters.some(c=>c.id===characterId) &&
      !seen.has(characterId) && characterTeamReservation(state,characterId)===null;
    if (!valid) {building.workerCharacterId=null;changed=true;continue;}
    seen.add(characterId);
  }
  return changed;
}
/**
 * In-place Save22 -> Save23 migration. Existing deadlines are not recalculated,
 * so no job loses prior work or receives a retroactive speed bonus.
 */
export function migrateProductionWorkers(state: ProductionWorkerWorld): boolean {
  if (!state.cityLayout) throw new Error('S16: Stadtlayout fehlt.');
  let changed=validateWorkerAssignments(state);
  for (const kind of ['forge','market'] as const) {
    const active=kind==='forge'?state.forgeJobs:state.marketJobs;
    const waiting=kind==='forge'?state.forgeQueue:state.marketQueue;
    const ready=kind==='forge'?state.forgeReadyJobs??[]:state.marketReadyJobs??[];
    const buildings=operatingBuildings(state,kind);
    const used=new Set<string>();
    for (const job of active) {
      let building=buildings.find(b=>b.buildingInstanceId===job.buildingInstanceId&&!used.has(b.buildingInstanceId));
      if (!building) building=buildings.find(b=>!used.has(b.buildingInstanceId));
      if (!building) throw new Error('S16: Laufender Auftrag ohne verfügbares Betriebsgebäude.');
      if (job.buildingInstanceId!==building.buildingInstanceId) {
        job.buildingInstanceId=building.buildingInstanceId; changed=true;
      }
      used.add(building.buildingInstanceId);
      if (job.workRate===undefined) {job.workRate=1;changed=true;}
      if (job.remainingWorkSeconds===undefined) {
        job.remainingWorkSeconds=Math.max(0,(Number(job.finishesAt)-Number(job.startedAt))/1000);
        changed=true;
      }
    }
    for (const job of [...waiting,...ready]) {
      if (job.buildingInstanceId!==undefined) { delete job.buildingInstanceId;changed=true; }
    }
    for (const building of (state.cityLayout.buildings??[]).filter(b=>b.buildingTypeId===kind)) {
      const next=active.find(job=>job.buildingInstanceId===building.buildingInstanceId)?.jobId??null;
      if (building.activeJobId!==next) {building.activeJobId=next;changed=true;}
    }
  }
  return changed;
}
function validateNow(now: number): void {
  if (!Number.isSafeInteger(now) || now<0) throw new Error('S16: ungültiger Fortschrittszeitpunkt.');
}
/** Store remaining real work before changing helper rate, then recompute deadline. */
export function rebaseActiveWork(state: ProductionWorkerWorld, building: CityBuildingInstance, at: number): void {
  validateNow(at);
  const active=building.buildingTypeId==='forge'?state.forgeJobs:state.marketJobs;
  const job=active.find(j=>j.buildingInstanceId===building.buildingInstanceId);
  if (!job || job.finishesAt===undefined) return;
  const oldRate=job.workRate??1;
  const remaining=Math.max(0,(job.finishesAt-at)/1000)*oldRate;
  job.remainingWorkSeconds=remaining;
  job.workRate=productionRate(building);
  job.startedAt=at;
  job.finishesAt=at+Math.ceil(remaining*1000/job.workRate);
}
/** Caller must first advance production to the exact change time. */
export function assignProductionHelper(state: ProductionWorkerWorld, buildingId: string, characterId: number|null, at: number): AssignmentOutcome {
  validateNow(at);
  const building=state.cityLayout?.buildings.find(b=>b.buildingInstanceId===buildingId);
  if (!building || building.status!=='placed' || (building.buildingTypeId!=='forge'&&building.buildingTypeId!=='market')) return 'invalid-building';
  if (building.workerCharacterId===characterId) return 'unchanged';
  if (characterId!==null) {
    if (!state.characters.some(c=>c.id===characterId)) return 'invalid-character';
    if (!mayWorkInBuilding(state,buildingId,characterId)) return 'occupied';
  }
  // Compute remaining physical work at the OLD multiplier before changing it.
  const jobs=building.buildingTypeId==='forge'?state.forgeJobs:state.marketJobs;
  const job=jobs.find(j=>j.buildingInstanceId===buildingId);
  const remaining=job?.finishesAt===undefined?null:Math.max(0,(job.finishesAt-at)/1000)*(job.workRate??1);
  building.workerCharacterId=characterId;
  if (job&&remaining!==null) {
    job.remainingWorkSeconds=remaining;
    job.workRate=productionRate(building);
    job.startedAt=at;
    job.finishesAt=at+Math.ceil(remaining*1000/job.workRate);
  }
  return 'assigned';
}
/**
 * One active job per physical building. Keep historical timestamps when
 * dispatching from the common queue after a completion or construction milestone.
 */
export function dispatchProductionQueue<T extends ProductionJob>(
  state: ProductionWorkerWorld, kind: ProductionKind, jobs: T[], queue: T[], at: number
): T[] {
  validateNow(at);
  const busy=new Set(jobs.map(job=>job.buildingInstanceId));
  const started:T[]=[];
  for (const building of operatingBuildings(state,kind)) {
    if (busy.has(building.buildingInstanceId) || !queue.length) continue;
    const job=queue.shift()!;
    job.status='active';
    job.buildingInstanceId=building.buildingInstanceId;
    const work=(kind==='forge' ? (job as T&{totalSeconds:number}).totalSeconds : (job as T&{seconds:number}).seconds);
    if (!Number.isFinite(work)||work<0) throw new Error('S16: Ungültige Auftragsdauer.');
    job.remainingWorkSeconds=work;
    job.workRate=productionRate(building);
    job.startedAt=at;
    job.finishesAt=at+Math.ceil(work*1000/job.workRate);
    building.activeJobId=job.jobId;
    jobs.push(job);
    busy.add(building.buildingInstanceId);
    started.push(job);
  }
  return started;
}
export function advanceProductionToReady<T extends ProductionJob>(
  state: ProductionWorkerWorld, kind: ProductionKind, jobs: T[], queue: T[],
  ready: T[], at: number, onReady:(job:T, at:number)=>void=()=>{}
): number {
  validateNow(at);
  let count=0;
  let guard=0;
  while (guard++<10000) {
    const due=jobs.filter(job=>Number.isFinite(job.finishesAt)&&Number(job.finishesAt)<=at)
      .sort((a,b)=>Number(a.finishesAt)-Number(b.finishesAt))[0];
    if (!due) break;
    const time=Number(due.finishesAt);
    const finished=jobs.filter(job=>Number(job.finishesAt)<=time);
    for (const job of finished) {
      const index=jobs.indexOf(job);
      if(index>=0)jobs.splice(index,1);
      const building=state.cityLayout?.buildings.find(b=>b.buildingInstanceId===job.buildingInstanceId);
      if(building&&building.activeJobId===job.jobId)building.activeJobId=null;
      delete job.buildingInstanceId;
      job.status='ready';
      ready.push(job);
      onReady(job,time);
    }
    count+=finished.length;
    dispatchProductionQueue(state,kind,jobs,queue,time);
  }
  dispatchProductionQueue(state,kind,jobs,queue,at);
  return count;
}
