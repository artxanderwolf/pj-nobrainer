import type { DungeonRunLike } from './dungeon-core.ts';
import { addMaterialQuantityById, type MaterialStorageInventory } from './material-storage-core.ts';
import type { MissionState } from './mission-core.ts';
import { QUALIFIED_RUN_WAVES } from './dungeon-progress-rules.ts';

export const DUNGEON_IDS = [1, 2, 3, 4, 5] as const;
export interface DungeonProgressSession { dungeonId: number; waves: number; qualified: boolean; searchEligible: boolean; }
export interface DungeonLogEntry { text: string; className: string; }
export interface DungeonSessionState {
  dungeonId: number;
  expeditionActive: boolean;
  dungeonAuto: boolean;
  dungeonStopRequested: boolean;
  dungeonRun: DungeonRunLike | null;
  dungeonSearch: { nextCheckAt: number } | null;
  dungeonLootCollect: { readyAt: number; drops: Array<{ materialId?: number | null; name?: string; category?: string }>; enemyCount: number } | null;
  dungeonLoot: MaterialStorageInventory;
  dungeonTeamSlots: Array<number | null>;
  dungeonCycleOriginalIds: number[];
  dungeonCycleActiveIds: number[];
  dungeonWavesDefeated: number;
  dungeonSessionStartWaves: number;
  dungeonSessionEndsAt: number | null;
  progress: DungeonProgressSession | null;
  log: DungeonLogEntry[];
}
export interface DungeonWorldState { dungeons?: Record<number, DungeonSessionState>; selectedDungeonId?: number; }
export function createDungeonSession(dungeonId: number): DungeonSessionState {
  return { dungeonId, expeditionActive:false, dungeonAuto:false, dungeonStopRequested:false, dungeonRun:null, dungeonSearch:null, dungeonLootCollect:null, dungeonLoot:{}, dungeonTeamSlots:[null,null,null,null], dungeonCycleOriginalIds:[], dungeonCycleActiveIds:[], dungeonWavesDefeated:0, dungeonSessionStartWaves:0, dungeonSessionEndsAt:null, progress:null, log:[] };
}
export function getDungeonSession(state: DungeonWorldState, dungeonId: number): DungeonSessionState {
  if (!(DUNGEON_IDS as readonly number[]).includes(dungeonId)) throw new Error(`Unbekannte Dungeon-ID ${dungeonId}.`);
  state.dungeons ??= {};
  return state.dungeons[dungeonId] ??= createDungeonSession(dungeonId);
}
export function dungeonSessionActive(session: DungeonSessionState): boolean {
  return !!(session.dungeonAuto || session.dungeonRun || session.dungeonSearch || session.dungeonLootCollect);
}
/** Original participants remain reserved even when fallen or waiting for a wave reset. */
export function characterDungeonReservation(state: DungeonWorldState, characterId: number, exceptDungeonId?: number): number | null {
  for (const id of DUNGEON_IDS) {
    if (id === exceptDungeonId) continue;
    const session = state.dungeons?.[id];
    if (session && dungeonSessionActive(session) && [...session.dungeonTeamSlots,...session.dungeonCycleOriginalIds,...(session.dungeonRun?.participantIds ?? [])].includes(characterId)) return id;
  }
  return null;
}
/** Domain action: validates again at click time; UI filtering alone is insufficient. */
export function assignDungeonCharacter(state: DungeonWorldState & { characters: Array<{id:number}> }, dungeonId:number, slot:number, characterId:number|null): boolean {
  const session=getDungeonSession(state,dungeonId);
  if(dungeonSessionActive(session) || !Number.isInteger(slot) || slot<0 || slot>=4)return false;
  if(characterId!==null && (!state.characters.some(c=>c.id===characterId) || characterDungeonReservation(state,characterId,dungeonId)!==null || session.dungeonTeamSlots.some((id,i)=>i!==slot && id===characterId)))return false;
  session.dungeonTeamSlots[slot]=characterId;
  return true;
}

const LEGACY_FIELDS = ['expeditionActive','dungeonAuto','dungeonStopRequested','dungeonRun','dungeonSearch','dungeonLootCollect','dungeonLoot','dungeonTeamSlots','dungeonCycleOriginalIds','dungeonCycleActiveIds','dungeonWavesDefeated','dungeonSessionStartWaves','dungeonSessionEndsAt'] as const;
/** One-way boundary from the actually released single-session saves (v8–v15). */
export function migrateParallelDungeons(state: Record<string, unknown> & MissionState): boolean {
  const legacy = !state.dungeons;
  let changed = legacy;
  if (legacy) {
    const run=state['dungeonRun'] as DungeonRunLike|null|undefined;
    const requested=Number(run?.dungeonId ?? state.selectedDungeonId) || 1;
    const id=(DUNGEON_IDS as readonly number[]).includes(requested)?requested:1;
    const session=getDungeonSession(state,id);
    for(const field of LEGACY_FIELDS) if(state[field]!==undefined)(session as unknown as Record<string,unknown>)[field]=state[field];
    const oldProgress=(state.releaseProgress as unknown as {session?:DungeonProgressSession|null})?.session;
    if(oldProgress?.dungeonId===id)session.progress=oldProgress;
    else if(dungeonSessionActive(session)){
      const waves=Math.max(0,(Number(session.dungeonWavesDefeated)||0)-(Number(session.dungeonSessionStartWaves)||0));
      session.progress={dungeonId:id,waves,qualified:waves>=QUALIFIED_RUN_WAVES,searchEligible:false};
      if(waves>=QUALIFIED_RUN_WAVES && state.releaseProgress)state.releaseProgress.qualifiedRuns[id]=Math.max(1,state.releaseProgress.qualifiedRuns[id]??0);
    }
  }
  for(const id of DUNGEON_IDS){
    const session=getDungeonSession(state,id);
    session.log ??= [];
    session.progress ??= null;
    // Re-evaluate saved in-progress runs after the balance change, without counting twice.
    if (session.progress && !session.progress.qualified && session.progress.waves >= QUALIFIED_RUN_WAVES && state.releaseProgress) {
      session.progress.qualified = true;
      state.releaseProgress.qualifiedRuns[id] = Math.max(0, Math.floor(Number(state.releaseProgress.qualifiedRuns[id]) || 0)) + 1;
      changed = true;
    }
  }
  for(const field of LEGACY_FIELDS)delete state[field];
  if(state.releaseProgress)delete (state.releaseProgress as unknown as {session?:unknown}).session;
  // Imported duplicate ownership is repaired deterministically, without deleting loot or healing characters.
  const reserved=new Set<number>();
  for(const id of DUNGEON_IDS){
    const session=getDungeonSession(state,id);
    if(!dungeonSessionActive(session))continue;
    const ids=[...new Set([...session.dungeonTeamSlots,...session.dungeonCycleOriginalIds,...(session.dungeonRun?.participantIds??[])].filter((n):n is number=>typeof n==='number'))];
    const duplicate=ids.some(n=>reserved.has(n));
    if(duplicate){
      for(const drop of session.dungeonLootCollect?.drops??[])if(drop.materialId)addMaterialQuantityById(session.dungeonLoot,drop.materialId,1);
      session.expeditionActive=false;session.dungeonStopRequested=false;session.dungeonAuto=false;session.dungeonRun=null;session.dungeonSearch=null;session.dungeonLootCollect=null;session.dungeonSessionEndsAt=null;session.progress=null;session.dungeonCycleOriginalIds=[];session.dungeonCycleActiveIds=[];
      session.log.unshift({text:'Lauf beim Laden angehalten: Charakter war bereits einem anderen aktiven Dungeon zugeordnet. Gesammelte Beute bleibt erhalten.',className:'bad'});
    }
    else ids.forEach(n=>reserved.add(n));
  }
  return changed;
}
