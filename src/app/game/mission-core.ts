import { getTeamSession, type TeamWorldState } from './team-core.ts';
import { REQUIRED_QUALIFIED_RUNS, ACCESS_SEARCH_START_WAVE, ACCESS_CHANCE, creditQualifiedRun } from './dungeon-progress-rules.ts';
import { getWeaponUnlockState, WEAPON_CRAFT_UNLOCK_TARGET, type WeaponCraftCounts } from './forge-core.ts';
export interface ReleaseProgress {
    version: 1;
    qualifiedRuns: Record<number, number>;
    accessFound: Record<number, boolean>;
    claimed: Record<string, boolean>;
    notified: Record<string, boolean>;
    notificationQueue: string[];
    healerDefeated: number;

}
export interface MissionState extends TeamWorldState {
    releaseProgress?: ReleaseProgress;
    weaponCraftCounts?: WeaponCraftCounts;
    selectedDungeonId?: number;
}
export const DUNGEON_NAMES = ['Trainingslager', 'Waffenkammer', 'Wald', 'Einsame Stadt', 'Heilige Ebenen'] as const;
const FORMS = ['sword', 'axe1h', 'sword2h', 'axe2h', 'bow', 'staff'];
const FORM_NAMES: Record<string, string> = { dagger: 'Dolch', sword: '1H Schwert', axe1h: '1H Axt', sword2h: '2H Schwert', axe2h: '2H Axt', bow: 'Bogen', staff: 'Stab' };
export interface Mission {
    id: string;
    title: string;
    visible: boolean;
    complete: boolean;
    claimed: boolean;
    progress: string;
}
const count = (n: unknown) => Math.max(0, Math.floor(Number(n) || 0));
/** Only migration boundary: preserve every weapon already available in a v14 save. */
export function initializeReleaseProgress(state: MissionState): ReleaseProgress {
    if (state.releaseProgress?.version === 1)
        return state.releaseProgress;
    const p: ReleaseProgress = { version: 1, qualifiedRuns: {}, accessFound: {}, claimed: {}, notified: {}, notificationQueue: [], healerDefeated: 0 };
    for (const form of FORMS)
        if (getWeaponUnlockState(form, state.weaponCraftCounts).unlocked)
            p.claimed[`weapon_${form}`] = true;
    state.releaseProgress = p;
    state.selectedDungeonId = 1;
    return p;
}
export function dungeonUnlocked(state: MissionState, dungeonId: number): boolean {
    return dungeonId === 1 || (dungeonId >= 2 && dungeonId <= 5 && !!state.releaseProgress?.claimed[`dungeon_${dungeonId}`]);
}
export function weaponUnlocked(state: MissionState, form: string): boolean {
    return form === 'dagger' || !!state.releaseProgress?.claimed[`weapon_${form}`];
}
export function missions(state: MissionState): Mission[] {
    const p = initializeReleaseProgress(state);
    const list: Mission[] = [2, 3, 4, 5].map(id => ({ id: `dungeon_${id}`, title: `Zugang: ${DUNGEON_NAMES[id - 1]}`, visible: dungeonUnlocked(state, id - 1), complete: !!p.accessFound[id], claimed: !!p.claimed[`dungeon_${id}`], progress: count(p.qualifiedRuns[id - 1]) >= REQUIRED_QUALIFIED_RUNS ? (p.accessFound[id] ? 'Zugang gefunden' : `Zugang suchen · ab Welle ${ACCESS_SEARCH_START_WAVE} eines neuen Laufs`) : `Qualifizierte Läufe: ${Math.min(REQUIRED_QUALIFIED_RUNS, count(p.qualifiedRuns[id - 1]))}/${REQUIRED_QUALIFIED_RUNS}` }));
    for (const form of FORMS) {
        const old = getWeaponUnlockState(form, state.weaponCraftCounts);
        const prerequisites = old.prerequisites;
        const visible = form === 'sword' || form === 'axe1h' || (form === 'sword2h' && weaponUnlocked(state, 'sword')) || (form === 'axe2h' && weaponUnlocked(state, 'axe1h')) || ((form === 'bow' || form === 'staff') && weaponUnlocked(state, 'sword2h') && weaponUnlocked(state, 'axe2h'));
        list.push({ id: `weapon_${form}`, title: `Waffenform: ${FORM_NAMES[form]}`, visible, complete: old.unlocked, claimed: !!p.claimed[`weapon_${form}`], progress: prerequisites.map(r => `${FORM_NAMES[r.weaponForm]} hergestellt: ${Math.min(r.current, WEAPON_CRAFT_UNLOCK_TARGET)}/${WEAPON_CRAFT_UNLOCK_TARGET}`).join(' · ') });
    }
    return list;
}
export function refreshMissionNotifications(state: MissionState): void {
    const p = initializeReleaseProgress(state);
    for (const m of missions(state))
        if (m.visible && m.complete && !m.claimed && !p.notified[m.id]) {
            p.notified[m.id] = true;
            p.notificationQueue.push(m.id);
        }
}
export function claimMission(state: MissionState, id: string): boolean {
    const m = missions(state).find(m => m.id === id);
    if (!m || !m.visible || !m.complete || m.claimed)
        return false;
    state.releaseProgress!.claimed[id] = true;
    refreshMissionNotifications(state);
    return true;
}
export function startProgressSession(state: MissionState, teamId: number): void {
    const p = initializeReleaseProgress(state);
    const dungeonId = getTeamSession(state,teamId).dungeonId;
    getTeamSession(state,teamId).progress = { dungeonId, waves: 0, qualified: false, searchEligible: count(p.qualifiedRuns[dungeonId]) >= REQUIRED_QUALIFIED_RUNS };
}
/** Called only after successful waves; roll provider is never invoked before eligibility or after a find. */
export function recordSuccessfulWave(state: MissionState, teamId: number, random: () => number): void {
    const dungeonId = getTeamSession(state,teamId).dungeonId;
    const p = initializeReleaseProgress(state), session = getTeamSession(state,teamId).progress;
    if (!session || session.dungeonId !== dungeonId)
        return;
    session.waves++;
    creditQualifiedRun(p.qualifiedRuns, session, dungeonId);
    const next = dungeonId + 1;
    if (next <= 5 && session.searchEligible && session.waves >= ACCESS_SEARCH_START_WAVE && !p.accessFound[next] && !p.claimed[`dungeon_${next}`] && random() < ACCESS_CHANCE)
        p.accessFound[next] = true;
    refreshMissionNotifications(state);
}
