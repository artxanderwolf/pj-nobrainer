import { teamIds, getTeamSession, characterTeamReservation, migrateTeams, type TeamSessionState as SessionData } from '../game/team-core.ts';
import { Injectable } from '@angular/core';
import { getDungeonDefinition } from '../game/dungeon-definitions.ts';
import { initializeReleaseProgress, type MissionState } from '../game/mission-core.ts';
import { CONFIG } from '../game/game-core';
import { resetDungeonCycle } from '../game/dungeon-core';
import { addMaterialQuantityById, getMaterialStorageEntries, type MaterialStorageInventory } from '../game/material-storage-core';
import { GameDungeonService, type DungeonActionResult, type DungeonUpdateResult } from './game-dungeon.service';
import { GameStateService, type MutableGameState } from './game-state.service';

interface DungeonSessionCharacter {
  id: number;
  hp: number;
  maxHp: number;
  alive: boolean;
}

interface DungeonSessionState extends MutableGameState, MissionState {
  characters: DungeonSessionCharacter[];
  session: SessionData;
  teams: Record<number,SessionData>;
}

export interface DungeonSessionTiming {
  active: boolean;
  totalMs: number;
  remainingMs: number;
  progress: number;
}

@Injectable({ providedIn: 'root' })
export class GameDungeonSessionService {
  private modalOpen = false;
  private openedTeamId = 1;

  constructor(
    private readonly gameState: GameStateService,
    private readonly gameDungeon: GameDungeonService
  ) {}

  open(_at = Date.now(), teamId = 1): DungeonActionResult {
    this.openedTeamId = teamId;
    this.modalOpen = true;
    return { events: [], saveRequested: false };
  }

  close(_at = Date.now()): DungeonActionResult {
    this.modalOpen = false;
    return { events: [], saveRequested: false };
  }

  /**
   * Bereitet einen aus dem Save geladenen Dungeonzustand vor.
   * Moderne Läufe mit persistierter Endzeit bleiben erhalten; alte oder verwaiste
   * Laufzustände ohne belastbare Endzeit werden einmal sauber zurückgesetzt.
   */
  prepareLoadedSession(_at = Date.now()): DungeonActionResult {
    const results = teamIds(this.gameState.getState()).map(id => this.prepareLoadedDungeon(id));
    return {events: results.flatMap(r=>r.events),saveRequested:results.some(r=>r.saveRequested)};
  }

  private prepareLoadedDungeon(teamId:number): DungeonActionResult {
    const state = this.getState(teamId);
    this.modalOpen = false;

    const active = this.hasActiveRun(state);
    const endsAt = this.getSessionEndsAt(state);
    if (active && endsAt !== null) {
      return { events: [], saveRequested: false };
    }

    const changed = this.hasRuntimeState(state);
    if (changed) this.resetRuntimeState(state);
    return { events: [], saveRequested: changed };
  }

  toggleRun(at = Date.now(), teamId = this.openedTeamId): DungeonActionResult {
    if (!this.modalOpen || teamId !== this.openedTeamId) {
      return {
        events: [],
        saveRequested: false,
        alertMessage: `Das ${this.getDisplayName()} kann nur im geöffneten Dungeon-Fenster gestartet oder abgebrochen werden.`
      };
    }

    const state = this.getState(teamId);
    if (this.hasActiveRun(state)) return this.finishSession(state, 'manual', at);

    const result = this.sanitizeResult(this.gameDungeon.toggleAuto(at,teamId));
    if (this.hasActiveRun(state)) {
      state.session.dungeonSessionEndsAt = at + this.getDurationMs();
      return { ...result, saveRequested: true };
    }
    return result;
  }

  update(now = Date.now()): DungeonUpdateResult {
    const results = teamIds(this.gameState.getState()).map(id => this.updateDungeon(now,id));
    return {events:results.flatMap(r=>r.events),saveRequested:results.some(r=>r.saveRequested),catchingUp:results.some(r=>r.catchingUp),alertMessage:results.map(r=>r.alertMessage).filter(Boolean).join('\n\n') || undefined};
  }

  private updateDungeon(now:number, teamId:number): DungeonUpdateResult {
    const state = this.getState(teamId);
    if (!this.hasActiveRun(state)) {
      const timingCleared = this.clearSessionTiming(state);
      return { events: [], saveRequested: timingCleared, catchingUp: false };
    }

    const endsAt = this.getSessionEndsAt(state);
    if (endsAt === null) {
      // Ein geladener Altstand ohne Endzeit wird bereits in prepareLoadedSession()
      // entfernt. Dieser Schutz verhindert weiterhin, dass ihm stillschweigend
      // eine neue Fünf-Stunden-Frist gegeben wird.
      return { events: [], saveRequested: false, catchingUp: false };
    }

    const updateAt = Math.min(now, endsAt);
    const result = this.sanitizeResult(this.gameDungeon.update(updateAt,teamId),teamId);

    if (!this.hasActiveRun(state)) {
      const timingCleared = this.clearSessionTiming(state);
      return { ...result, saveRequested: result.saveRequested || timingCleared };
    }

    if (now >= endsAt) {
      const finished = this.finishSession(state, 'timeout', endsAt);
      return {
        ...finished,
        events: [...result.events, ...finished.events],
        saveRequested: result.saveRequested || finished.saveRequested,
        catchingUp: result.catchingUp
      };
    }

    return result;
  }

  collectLoot(teamId=this.openedTeamId): DungeonActionResult {
    if (this.isRunActive(teamId)) return {events:[],saveRequested:false};
    return this.sanitizeResult(this.gameDungeon.collectLoot(teamId),teamId);
  }

  getTiming(now = Date.now(), teamId = this.openedTeamId): DungeonSessionTiming {
    const totalMs = this.getDurationMs(teamId);
    const state = this.getState(teamId);
    const endsAt = this.getSessionEndsAt(state);
    const active = this.hasActiveRun(state) && endsAt !== null;
    const remainingMs = active ? Math.max(0, Number(endsAt) - now) : totalMs;
    return {
      active,
      totalMs,
      remainingMs,
      progress: totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0
    };
  }

  getOpenedTeamId(): number { return this.openedTeamId; }

  isOpen(): boolean {
    return this.modalOpen;
  }

  isRunActive(teamId=this.openedTeamId): boolean {
    return this.hasActiveRun(this.getState(teamId));
  }

  getDurationMs(teamId=this.openedTeamId): number {
    const configured = Number(getDungeonDefinition(this.getState(teamId).session.dungeonId).durationMs);
    if (!Number.isFinite(configured) || configured <= 0) {
      throw new Error(`${this.getDisplayName()} benötigt eine positive durationMs-Konfiguration.`);
    }
    return configured;
  }

  private finishSession(
    state: DungeonSessionState,
    reason: 'manual' | 'timeout',
    at: number
  ): DungeonActionResult {
    const waves = this.gameDungeon.getSessionWaveCount(state.session.teamId);
    const teamIds = state.session.dungeonCycleOriginalIds?.length
      ? [...state.session.dungeonCycleOriginalIds]
      : this.selectedIds(state);
    this.preservePendingLoot(state);
    const loot = getMaterialStorageEntries(state.session.dungeonLoot)
      .filter(entry => entry.qty > 0)
      .sort((left, right) => left.displayName.localeCompare(right.displayName))
      .map(entry => `${entry.displayName} ×${entry.qty}`);

    this.resetRuntimeState(state);

    const displayName = this.getDisplayName(state.session.teamId);
    const reasonText = reason === 'manual'
      ? 'Grund: Manueller Abbruch.'
      : 'Grund: Maximale Laufzeit von 5 Stunden erreicht.';
    const title = reason === 'manual' ? `${displayName} – Lauf abgebrochen` : `${displayName} – Lauf beendet`;
    const teamNames = teamIds
      .map(id => state.characters.find(character => character.id === id))
      .filter((character): character is DungeonSessionCharacter => Boolean(character))
      .map(character => `#${character.id}`);

    return {
      events: [{
        teamId:state.session.teamId,
        text: reason === 'manual'
          ? `${displayName}-Lauf manuell abgebrochen.`
          : `${displayName}-Lauf nach 5 Stunden beendet.`,
        className: reason === 'manual' ? 'muted' : 'good'
      }],
      saveRequested: true,
      alertMessage: [
        title,
        '',
        reasonText,
        `Team: ${teamNames.length ? teamNames.join(', ') : '–'}`,
        `Besiegte Wellen: ${waves}`,
        `Beute: ${loot.length ? loot.join(', ') : 'keine'}`,
        ...(loot.length ? ['', 'Beute liegt zum Einsammeln bereit.'] : [])
      ].join('\n')
    };
  }

  private preservePendingLoot(state: DungeonSessionState): void {
    for (const drop of state.session.dungeonLootCollect?.drops ?? []) {
      if (drop.materialId) addMaterialQuantityById(state.session.dungeonLoot,drop.materialId,1);
    }
    state.session.dungeonLootCollect = null;
  }

  private resetRuntimeState(state: DungeonSessionState): void {
    this.preservePendingLoot(state);
    const selected = this.selectedIds(state)
      .filter(id=>characterTeamReservation(state,id,state.session.teamId)===null)
      .map(id => state.characters.find(character => character.id === id))
      .filter((character): character is DungeonSessionCharacter => Boolean(character));
    state.session.progress = null;
    resetDungeonCycle(selected);
    state.session.dungeonAuto = false;
    state.session.dungeonStopRequested = false;
    state.session.dungeonRun = null;
    state.session.dungeonSearch = null;
    state.session.dungeonLootCollect = null;
    state.session.expeditionActive = false;
    state.session.dungeonCycleOriginalIds = [];
    state.session.dungeonCycleActiveIds = [];
    state.session.dungeonSessionStartWaves = Number(state.session.dungeonWavesDefeated) || 0;
    state.session.dungeonSessionEndsAt = null;
  }

  private clearSessionTiming(state: DungeonSessionState): boolean {
    if (state.session.dungeonSessionEndsAt === null || state.session.dungeonSessionEndsAt === undefined) return false;
    state.session.dungeonSessionEndsAt = null;
    return true;
  }

  private getSessionEndsAt(state: DungeonSessionState): number | null {
    const endsAt = Number(state.session.dungeonSessionEndsAt);
    return Number.isFinite(endsAt) && endsAt > 0 ? endsAt : null;
  }

  private hasRuntimeState(state: DungeonSessionState): boolean {
    return Boolean(
      state.session.dungeonAuto || state.session.dungeonStopRequested || state.session.dungeonRun || state.session.dungeonSearch ||
      state.session.dungeonLootCollect || state.session.expeditionActive || state.session.dungeonCycleOriginalIds?.length ||
      state.session.dungeonCycleActiveIds?.length || this.getSessionEndsAt(state) !== null
    );
  }

  private hasActiveRun(state: DungeonSessionState): boolean {
    return Boolean(state.session.dungeonAuto || state.session.dungeonRun || state.session.dungeonSearch || state.session.dungeonLootCollect);
  }

  private selectedIds(state: DungeonSessionState): number[] {
    return (state.session.dungeonTeamSlots ?? [])
      .map(id => Number(id))
      .filter(id => Number.isInteger(id) && id > 0 && state.characters.some(character => character.id === id));
  }

  private getDisplayName(teamId=this.openedTeamId): string {
    const displayName = getDungeonDefinition(this.getState(teamId).session.dungeonId).displayName;
    return displayName || 'Trainingslager';
  }

  private sanitizeResult<T extends DungeonActionResult>(result: T, teamId=this.openedTeamId): T {
    const displayName = this.getDisplayName(teamId);
    const events = result.events.map(event => ({
      ...event,
      text: event.text
        .replace(/Dungeon-1/g, displayName)
        .replace(/Dungeon 1/g, displayName)
        .replace(/\s*·\s*[\d.,]+\s*EN je Charakter/g, '')
        .replace(/\s*\([\d.,]+\s*HP\)/g, '')
        .replace(/\s+\./g, '.')
    }));
    const alertMessage = result.alertMessage
      ?.replace(/Dungeon-1/g, displayName)
      .replace(/Dungeon 1/g, displayName);
    return { ...result, events:events.map(event=>({...event,teamId})), ...(alertMessage ? { alertMessage } : {}) };
  }

  private getState(teamId=this.openedTeamId): DungeonSessionState {
    const root=this.gameState.getState();
    initializeReleaseProgress(root);
    if(!root['teams'])migrateTeams(root);
    return {characters:root['characters'],releaseProgress:root['releaseProgress'],teams:root['teams'],session:getTeamSession(root,teamId)} as DungeonSessionState;
  }
}
