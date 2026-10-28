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
  expeditionActive: boolean;
  dungeonAuto: boolean;
  dungeonStopRequested?: boolean;
  dungeonRun: unknown | null;
  dungeonSearch: unknown | null;
  dungeonLootCollect: unknown | null;
  dungeonLoot: MaterialStorageInventory;
  dungeonTeamSlots: Array<number | null>;
  dungeonCycleOriginalIds: number[];
  dungeonCycleActiveIds: number[];
  dungeonWavesDefeated: number;
  dungeonSessionStartWaves?: number;
  dungeonSessionEndsAt?: number | null;
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

  constructor(
    private readonly gameState: GameStateService,
    private readonly gameDungeon: GameDungeonService
  ) {}

  open(_at = Date.now()): DungeonActionResult {
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
    const state = this.getState();
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

  toggleRun(at = Date.now()): DungeonActionResult {
    if (!this.modalOpen) {
      return {
        events: [],
        saveRequested: false,
        alertMessage: `Das ${this.getDisplayName()} kann nur im geöffneten Dungeon-Fenster gestartet oder abgebrochen werden.`
      };
    }

    const state = this.getState();
    if (this.hasActiveRun(state)) return this.finishSession(state, 'manual', at);

    const result = this.sanitizeResult(this.gameDungeon.toggleAuto(at));
    if (this.hasActiveRun(state)) {
      state.dungeonSessionEndsAt = at + this.getDurationMs();
      return { ...result, saveRequested: true };
    }
    return result;
  }

  update(now = Date.now()): DungeonUpdateResult {
    const state = this.getState();
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
    const result = this.sanitizeResult(this.gameDungeon.update(updateAt));

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

  collectLoot(): DungeonActionResult {
    return this.sanitizeResult(this.gameDungeon.collectLoot());
  }

  getTiming(now = Date.now()): DungeonSessionTiming {
    const totalMs = this.getDurationMs();
    const state = this.getState();
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

  isOpen(): boolean {
    return this.modalOpen;
  }

  isRunActive(): boolean {
    return this.hasActiveRun(this.getState());
  }

  getDurationMs(): number {
    const configured = Number(getDungeonDefinition(this.getState().selectedDungeonId ?? 1).durationMs);
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
    const waves = this.gameDungeon.getSessionWaveCount();
    const teamIds = state.dungeonCycleOriginalIds?.length
      ? [...state.dungeonCycleOriginalIds]
      : this.selectedIds(state);
    const loot = getMaterialStorageEntries(state.dungeonLoot)
      .filter(entry => entry.qty > 0)
      .sort((left, right) => left.displayName.localeCompare(right.displayName))
      .map(entry => `${entry.displayName} ×${entry.qty}`);

    this.resetRuntimeState(state);

    const displayName = this.getDisplayName();
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
      .map(id => state.characters.find(character => character.id === id))
      .filter((character): character is DungeonSessionCharacter => Boolean(character));
    initializeReleaseProgress(state).session = null;
    resetDungeonCycle(selected);
    state.dungeonAuto = false;
    state.dungeonStopRequested = false;
    state.dungeonRun = null;
    state.dungeonSearch = null;
    state.dungeonLootCollect = null;
    state.expeditionActive = false;
    state.dungeonCycleOriginalIds = [];
    state.dungeonCycleActiveIds = [];
    state.dungeonSessionStartWaves = Number(state.dungeonWavesDefeated) || 0;
    state.dungeonSessionEndsAt = null;
  }

  private clearSessionTiming(state: DungeonSessionState): boolean {
    if (state.dungeonSessionEndsAt === null || state.dungeonSessionEndsAt === undefined) return false;
    state.dungeonSessionEndsAt = null;
    return true;
  }

  private getSessionEndsAt(state: DungeonSessionState): number | null {
    const endsAt = Number(state.dungeonSessionEndsAt);
    return Number.isFinite(endsAt) && endsAt > 0 ? endsAt : null;
  }

  private hasRuntimeState(state: DungeonSessionState): boolean {
    return Boolean(
      state.dungeonAuto || state.dungeonStopRequested || state.dungeonRun || state.dungeonSearch ||
      state.dungeonLootCollect || state.expeditionActive || state.dungeonCycleOriginalIds?.length ||
      state.dungeonCycleActiveIds?.length || this.getSessionEndsAt(state) !== null
    );
  }

  private hasActiveRun(state: DungeonSessionState): boolean {
    return Boolean(state.dungeonAuto || state.dungeonRun || state.dungeonSearch || state.dungeonLootCollect);
  }

  private selectedIds(state: DungeonSessionState): number[] {
    return (state.dungeonTeamSlots ?? [])
      .map(id => Number(id))
      .filter(id => Number.isInteger(id) && id > 0 && state.characters.some(character => character.id === id));
  }

  private getDisplayName(): string {
    const displayName = getDungeonDefinition(this.getState().selectedDungeonId ?? 1).displayName;
    return displayName || 'Trainingslager';
  }

  private sanitizeResult<T extends DungeonActionResult>(result: T): T {
    const displayName = this.getDisplayName();
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
    return { ...result, events, ...(alertMessage ? { alertMessage } : {}) };
  }

  private getState(): DungeonSessionState {
    return this.gameState.getState<DungeonSessionState>();
  }
}
