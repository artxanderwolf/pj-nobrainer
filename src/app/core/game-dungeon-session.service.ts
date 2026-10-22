import { Injectable } from '@angular/core';
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

interface DungeonSessionState extends MutableGameState {
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
  private runStartedAt: number | null = null;

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
   * Verwirft ausschließlich einen aus einem Save geladenen Alt-Lauf.
   * Ein normales Schließen des Popups darf den aktiven Trainingslager-Run nicht beenden.
   */
  resetLoadedSession(_at = Date.now()): DungeonActionResult {
    const state = this.getState();
    const changed = this.hasRuntimeState(state);
    this.resetRuntimeState(state);
    this.modalOpen = false;
    this.runStartedAt = null;
    return { events: [], saveRequested: changed };
  }

  toggleRun(at = Date.now()): DungeonActionResult {
    if (!this.modalOpen) {
      return {
        events: [],
        saveRequested: false,
        alertMessage: 'Das Trainingslager kann nur im geöffneten Dungeon-Fenster gestartet oder abgebrochen werden.'
      };
    }

    const state = this.getState();
    if (this.hasActiveRun(state)) return this.finishSession(state, 'manual', at);

    const result = this.sanitizeResult(this.gameDungeon.toggleAuto(at));
    if (this.hasActiveRun(state)) this.runStartedAt = at;
    return result;
  }

  update(now = Date.now()): DungeonUpdateResult {
    const state = this.getState();
    if (!this.hasActiveRun(state)) {
      this.runStartedAt = null;
      return { events: [], saveRequested: false, catchingUp: false };
    }

    if (this.runStartedAt === null) this.runStartedAt = now;
    if (now - this.runStartedAt >= this.getDurationMs()) {
      const finished = this.finishSession(state, 'timeout', now);
      return { ...finished, catchingUp: false };
    }

    const result = this.sanitizeResult(this.gameDungeon.update(now));
    if (!this.hasActiveRun(state)) this.runStartedAt = null;
    return result;
  }

  collectLoot(): DungeonActionResult {
    return this.sanitizeResult(this.gameDungeon.collectLoot());
  }

  getTiming(now = Date.now()): DungeonSessionTiming {
    const totalMs = this.getDurationMs();
    const state = this.getState();
    const active = this.hasActiveRun(state) && this.runStartedAt !== null;
    const elapsed = active ? Math.max(0, now - Number(this.runStartedAt)) : 0;
    const remainingMs = active ? Math.max(0, totalMs - elapsed) : totalMs;
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
    const configured = Number((CONFIG.dungeon as typeof CONFIG.dungeon & { durationMs?: number }).durationMs);
    if (!Number.isFinite(configured) || configured <= 0) {
      throw new Error('Das Trainingslager benötigt eine positive durationMs-Konfiguration.');
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
    this.runStartedAt = null;

    const reasonText = reason === 'manual'
      ? 'Grund: Manueller Abbruch.'
      : 'Grund: Maximale Laufzeit von 5 Stunden erreicht.';
    const title = reason === 'manual' ? 'Trainingslager – Lauf abgebrochen' : 'Trainingslager – Lauf beendet';
    const teamNames = teamIds
      .map(id => state.characters.find(character => character.id === id))
      .filter((character): character is DungeonSessionCharacter => Boolean(character))
      .map(character => `#${character.id}`);

    return {
      events: [{
        text: reason === 'manual'
          ? 'Trainingslager-Lauf manuell abgebrochen.'
          : 'Trainingslager-Lauf nach 5 Stunden beendet.',
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
  }

  private hasRuntimeState(state: DungeonSessionState): boolean {
    return Boolean(
      state.dungeonAuto || state.dungeonStopRequested || state.dungeonRun || state.dungeonSearch ||
      state.dungeonLootCollect || state.expeditionActive || state.dungeonCycleOriginalIds?.length ||
      state.dungeonCycleActiveIds?.length
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

  private sanitizeResult<T extends DungeonActionResult>(result: T): T {
    const events = result.events.map(event => ({
      ...event,
      text: event.text
        .replace(/Dungeon-1/g, 'Trainingslager')
        .replace(/Dungeon 1/g, 'Trainingslager')
        .replace(/\s*·\s*[\d.,]+\s*EN je Charakter/g, '')
        .replace(/\s+\./g, '.')
    }));
    const alertMessage = result.alertMessage
      ?.replace(/Dungeon-1/g, 'Trainingslager')
      .replace(/Dungeon 1/g, 'Trainingslager');
    return { ...result, events, ...(alertMessage ? { alertMessage } : {}) };
  }

  private getState(): DungeonSessionState {
    return this.gameState.getState<DungeonSessionState>();
  }
}
