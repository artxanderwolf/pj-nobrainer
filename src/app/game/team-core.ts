import { createDungeonSession, dungeonSessionActive, migrateParallelDungeons, DUNGEON_IDS, type DungeonSessionState, type DungeonWorldState } from './parallel-dungeon-core.ts';
import { CONFIG } from './game-core.ts';
import { calculateUpgradeCost } from './economy-core.ts';
import { dungeonUnlocked, type MissionState } from './mission-core.ts';
import { addMaterialQuantityById } from './material-storage-core.ts';

export interface TeamSessionState extends DungeonSessionState { teamId: number; }
export interface TeamWorldState extends DungeonWorldState { teams?: Record<number, TeamSessionState>; }
export function teamIds(state: TeamWorldState): number[] {
  return Object.keys(state.teams ?? {}).map(Number).sort((a,b) => a-b);
}
export function getTeamSession(state: TeamWorldState, teamId: number): TeamSessionState {
  const team = state.teams?.[teamId];
  if (!team || !Number.isInteger(teamId)) throw new Error(`Unbekannte Team-ID ${teamId}.`);
  return team;
}
export function createTeam(teamId: number, dungeonId = 1): TeamSessionState {
  return { ...createDungeonSession(dungeonId), teamId };
}
/** One-way migration of released saves. Retain every selected group and all earned progress. */
export function migrateTeams(state: Record<string, unknown> & MissionState & TeamWorldState): boolean {
  if (state.teams) return repairTeamReservations(state);
  migrateParallelDungeons(state);
  state.teams = {};
  for (const dungeonId of DUNGEON_IDS) {
    const session = state.dungeons![dungeonId];
    const meaningful = dungeonSessionActive(session) || session.dungeonTeamSlots.some(id => id !== null) ||
      Object.keys(session.dungeonLoot).length > 0 || session.log.length > 0 || session.dungeonWavesDefeated > 0;
    if (meaningful) {
      const teamId = teamIds(state).length + 1;
      state.teams[teamId] = { ...session, teamId };
    }
  }
  if (!teamIds(state).length) state.teams[1] = createTeam(1);
  delete state.dungeons;
  repairTeamReservations(state);
  return true;
}
/** Imported duplicate bookings are stopped deterministically, preserving earned drops and HP. */
function repairTeamReservations(state: TeamWorldState): boolean {
  const reserved = new Set<number>();
  let changed = false;
  for (const teamId of teamIds(state)) {
    const team = getTeamSession(state,teamId);
    if (!dungeonSessionActive(team)) continue;
    const ids = [...new Set([...team.dungeonTeamSlots,...team.dungeonCycleOriginalIds,...(team.dungeonRun?.participantIds??[])].filter((id):id is number=>typeof id==='number'))];
    if (ids.some(id=>reserved.has(id))) {
      for (const drop of team.dungeonLootCollect?.drops??[]) if(drop.materialId) addMaterialQuantityById(team.dungeonLoot,drop.materialId,1);
      Object.assign(team,{expeditionActive:false,dungeonAuto:false,dungeonStopRequested:false,dungeonRun:null,dungeonSearch:null,dungeonLootCollect:null,dungeonSessionEndsAt:null,progress:null,dungeonCycleOriginalIds:[],dungeonCycleActiveIds:[]});
      team.log.unshift({text:'Lauf beim Laden angehalten: Charakter bereits in einem anderen Team aktiv. Beute bleibt erhalten.',className:'bad'});
      changed = true;
    } else ids.forEach(id=>reserved.add(id));
  }
  return changed;
}
export function characterTeamReservation(state: TeamWorldState, characterId: number, exceptTeamId?: number): number | null {
  for (const teamId of teamIds(state)) {
    if (teamId === exceptTeamId) continue;
    const team = getTeamSession(state, teamId);
    if (dungeonSessionActive(team) && [...team.dungeonTeamSlots, ...team.dungeonCycleOriginalIds, ...(team.dungeonRun?.participantIds ?? [])].includes(characterId)) return teamId;
  }
  return null;
}
export function assignTeamCharacter(state: TeamWorldState & {characters: Array<{id:number}>}, teamId: number, slot: number, characterId: number | null): boolean {
  const team = getTeamSession(state, teamId);
  if (dungeonSessionActive(team) || !Number.isInteger(slot) || slot < 0 || slot >= 4) return false;
  if (characterId !== null && (!state.characters.some(c=>c.id===characterId) || characterTeamReservation(state,characterId,teamId)!==null || team.dungeonTeamSlots.some((id,i)=>i!==slot && id===characterId))) return false;
  team.dungeonTeamSlots[slot] = characterId;
  return true;
}
export function selectTeamDungeon(state: TeamWorldState & MissionState, teamId: number, dungeonId: number): boolean {
  const team = getTeamSession(state, teamId);
  if (!(DUNGEON_IDS as readonly number[]).includes(dungeonId) || !dungeonUnlocked(state,dungeonId) || dungeonSessionActive(team) || Object.values(team.dungeonLoot).some(entry=>Number(entry?.qty)>0)) return false;
  team.dungeonId = dungeonId;
  return true;
}
export function getTeamOffer(state: TeamWorldState & {gold:number}) {
  const current = teamIds(state).length;
  const costNickel = calculateUpgradeCost('teamSlots',current);
  const max = CONFIG.upgrades.teamSlots.max;
  const reason = current >= max ? 'max' : !Number.isFinite(state.gold) || state.gold < costNickel ? 'insufficient-funds' : 'ready';
  return {ok:reason==='ready',reason,current,max,costNickel};
}
export function buyTeam(state: TeamWorldState & {gold:number}) {
  const offer = getTeamOffer(state);
  if (!offer.ok) return offer;
  const teamId = Math.max(0,...teamIds(state)) + 1;
  state.gold -= offer.costNickel;
  state.teams![teamId] = createTeam(teamId);
  return {...offer,teamId};
}
