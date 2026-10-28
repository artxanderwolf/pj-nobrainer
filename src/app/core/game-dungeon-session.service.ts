import { DUNGEON_IDS, getDungeonSession, characterDungeonReservation, migrateParallelDungeons, type DungeonSessionState as SessionData } from '../game/parallel-dungeon-core.ts';
import { Injectable } from '@angular/core';
import { getDungeonDefinition } from '../game/dungeon-definitions.ts';
import { initializeReleaseProgress, type MissionState } from '../game/mission-core.ts';
import { CONFIG } from '../game/game-core';
import { resetDungeonCycle } from '../game/dungeon-core';
import { getMaterialStorageEntries, type MaterialStorageInventory } from '../game/material-storage-core';
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
  dungeons: Record<number,SessionData>;
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
  private openedDungeonId = 1;

  constructor(
    private readonly gameState: GameStateService,
    private readonly gameDungeon: GameDungeonService
  ) {}

  open(_at = Date.now(), dungeonId = 1): DungeonActionResult {
    this.openedDungeonId = dungeonId;
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
    const results = DUNGEON_IDS.map(id => this.prepareLoadedDungeon(id));
    return {events: results.flatMap(r=>r.events),saveRequested:results.some(r=>r.saveRequested)};
  }

  private prepareLoadedDungeon(dungeonId:number): DungeonActionResult {
    const state = this.getState(dungeonId);
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

  toggleRun(at = Date.now(), dungeonId = this.openedDungeonId): DungeonActionResult {
    if (!this.modalOpen || dungeonId !== this.openedDungeonId) {
      return {
        events: [],
        saveRequested: false,
        alertMessage: `Das ${this.getDisplayName()} kann nur im geöffneten Dungeon-Fenster gestartet oder abgebrochen werden.`
      };
    }

    const state = this.getState(dungeonId);
    if (this.hasActiveRun(state)) return this.finishSession(state, 'manual', at);

    const result = this.sanitizeResult(this.gameDungeon.toggleAuto(at,dungeonId));
    if (this.hasActiveRun(state)) {
      state.session.dungeonSessionEndsAt = at + this.getDurationMs();
      return { ...result, saveRequested: true };
    }
    return result;
  }

  update(now = Date.now()): DungeonUpdateResult {
    const results = DUNGEON_IDS.map(id => this.updateDungeon(now,id));
    return {events:results.flatMap(r=>r.events),saveRequested:results.some(r=>r.saveRequested),catchingUp:results.some(r=>r.catchingUp),alertMessage:results.map(r=>r.alertMessage).filter(Boolean).join('\n\n') || undefined};
  }

  private updateDungeon(now:number, dungeonId:number): DungeonUpdateResult {
    const state = this.getState(dungeonId);
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
    const result = this.sanitizeResult(this.gameDungeon.update(updateAt,dungeonId),dungeonId);

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

  collectLoot(dungeonId=this.openedDungeonId): DungeonActionResult {
    if (this.isRunActive(dungeonId)) return {events:[],saveRequested:false};
    return this.sanitizeResult(this.gameDungeon.collectLoot(dungeonId),dungeonId);
  }

  getTiming(now = Date.now(), dungeonId = this.openedDungeonId): DungeonSessionTiming {
    const totalMs = this.getDurationMs(dungeonId);
    const state = this.getState(dungeonId);
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

  getOpenedDungeonId(): number { return this.openedDungeonId; }

  isOpen(): boolean {
    return this.modalOpen;
  }

  isRunActive(dungeonId=this.openedDungeonId): boolean {
    return this.hasActiveRun(this.getState(dungeonId));
  }

  getDurationMs(dungeonId=this.openedDungeonId): number {
    const configured = Number(getDungeonDefinition(dungeonId).durationMs);
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
    const waves = this.gameDungeon.getSessionWaveCount(state.session.dungeonId);
    const teamIds = state.session.dungeonCycleOriginalIds?.length
      ? [...state.session.dungeonCycleOriginalIds]
      : this.selectedIds(state);
    const loot = getMaterialStorageEntries(state.session.dungeonLoot)
      .filter(entry => entry.qty > 0)
      .sort((left, right) => left.displayName.localeCompare(right.displayName))
      .map(entry => `${entry.displayName} ×${entry.qty}`);

    this.resetRuntimeState(state);

    const displayName = this.getDisplayName(state.session.dungeonId);
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
        dungeonId:state.session.dungeonId,
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

  private resetRuntimeState(state: DungeonSessionState): void {
    const selected = this.selectedIds(state)
      .filter(id=>characterDungeonReservation(state,id,state.session.dungeonId)===null)
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

  private getDisplayName(dungeonId=this.openedDungeonId): string {
    const displayName = getDungeonDefinition(dungeonId).displayName;
    return displayName || 'Trainingslager';
  }

  private sanitizeResult<T extends DungeonActionResult>(result: T, dungeonId=this.openedDungeonId): T {
    const displayName = this.getDisplayName(dungeonId);
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
    return { ...result, events:events.map(event=>({...event,dungeonId})), ...(alertMessage ? { alertMessage } : {}) };
  }

  private getState(dungeonId=this.openedDungeonId): DungeonSessionState {
    const root=this.gameState.getState();
    initializeReleaseProgress(root);
    if(!root['dungeons'])migrateParallelDungeons(root);
    return {characters:root['characters'],releaseProgress:root['releaseProgress'],dungeons:root['dungeons'],session:getDungeonSession(root,dungeonId)} as DungeonSessionState;
  }
}
