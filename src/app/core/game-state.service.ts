import { migrateLegacyHealers } from '../game/healer-migration-core.ts';
import { synchronizeTavernOffers } from '../game/tavern-offers-core.ts';
import { migrateCharacterRaces } from '../game/character-race-core.ts';
import { initializeReleaseProgress } from '../game/mission-core.ts';
import { migrateTeams } from '../game/team-core.ts';
import { migrateCityLayout } from '../game/city-layout-core.ts';
import { migrateCityEconomy } from '../game/city-economy-core.ts';
import { initializeCityConstruction } from '../game/city-construction-core.ts';
import { reconcileCityTeamBuildings } from '../game/city-team-core.ts';
import { Injectable } from '@angular/core';

export type MutableGameState = Record<string, unknown>;

export const DEFAULT_CITY_NAME = 'Stadt Name';
export const CITY_NAME_MAX_LENGTH = 40;

export function normalizeCityName(value: unknown): string {
  const normalized = typeof value === 'string'
    ? value.replace(/\s+/g, ' ').trim()
    : '';
  return (normalized || DEFAULT_CITY_NAME).slice(0, CITY_NAME_MAX_LENGTH);
}

interface GameStateBootstrap {
  initialize(initialState: MutableGameState): MutableGameState;
  replace(nextState: MutableGameState): MutableGameState;
}

declare global {
  interface Window {
    NoBrainerStateBootstrap?: GameStateBootstrap;
  }
}

@Injectable({ providedIn: 'root' })
export class GameStateService {
  private readonly state: MutableGameState = {};
  private initialized = false;
  private dungeonMigrationPending = false;
  private cityMigrationPending = false;
  private raceMigrationPending = false;
  private healerMigrationPending = false;
  private tavernMigrationPending = false;

  consumeTavernMigration(): boolean {
    const pending = this.tavernMigrationPending;
    this.tavernMigrationPending = false;
    return pending;
  }

  consumeHealerMigration(): boolean {
    const pending = this.healerMigrationPending;
    this.healerMigrationPending = false;
    return pending;
  }

  consumeRaceMigration(): boolean {
    const pending = this.raceMigrationPending;
    this.raceMigrationPending = false;
    return pending;
  }

  consumeCityMigration(): boolean {
    const pending = this.cityMigrationPending;
    this.cityMigrationPending = false;
    return pending;
  }

  consumeDungeonMigration(): boolean {
    const pending=this.dungeonMigrationPending;
    this.dungeonMigrationPending=false;
    return pending;
  }

  openBootstrapRegistration(): void {
    if (window.NoBrainerStateBootstrap) {
      throw new Error('NoBrainer-State-Bootstrap ist bereits geöffnet.');
    }

    window.NoBrainerStateBootstrap = {
      initialize: (initialState: MutableGameState) => this.initializeState(initialState),
      replace: (nextState: MutableGameState) => this.replaceState(nextState)
    };
  }

  closeBootstrapRegistration(): void {
    delete window.NoBrainerStateBootstrap;
  }

  getState<TState extends MutableGameState = MutableGameState>(): TState {
    if (!this.initialized) {
      throw new Error('NoBrainer-Spielzustand wurde noch nicht initialisiert.');
    }
    return this.state as TState;
  }

  private initializeState(initialState: MutableGameState): MutableGameState {
    if (this.initialized) {
      throw new Error('NoBrainer-Spielzustand wurde bereits initialisiert.');
    }
    this.replaceContents(initialState);
    this.initialized = true;
    return this.state;
  }

  private replaceState(nextState: MutableGameState): MutableGameState {
    if (!this.initialized) {
      throw new Error('NoBrainer-Spielzustand kann vor der Initialisierung nicht ersetzt werden.');
    }
    this.replaceContents(nextState);
    return this.state;
  }

  private replaceContents(nextState: MutableGameState): void {
    if (!nextState || typeof nextState !== 'object' || Array.isArray(nextState)) {
      throw new Error('Ungültiger NoBrainer-Spielzustand.');
    }

    // Fehlerhafte vorhandene Stadt-Saves vor dem Ersetzen prüfen. So kann ein
    // ungültiger Import den bereits geladenen Zustand nicht teilweise löschen.
    const cityMigrationChanged = migrateCityLayout(nextState);
    const raceMigrationChanged = migrateCharacterRaces(nextState);
    for (const key of Object.keys(this.state)) delete this.state[key];
    this.cityMigrationPending = cityMigrationChanged;
    this.raceMigrationPending = raceMigrationChanged;
    this.dungeonMigrationPending = !nextState['teams'];
    Object.assign(this.state, nextState);
    this.state['cityName'] = normalizeCityName(this.state['cityName']);
    initializeReleaseProgress(this.state);
    this.dungeonMigrationPending = migrateTeams(this.state) || this.dungeonMigrationPending;
    this.healerMigrationPending = migrateLegacyHealers(this.state);
    this.cityMigrationPending = migrateCityEconomy(this.state) || this.cityMigrationPending;
    this.cityMigrationPending = initializeCityConstruction(this.state) || this.cityMigrationPending;
    this.cityMigrationPending = reconcileCityTeamBuildings(this.state) || this.cityMigrationPending;
    this.tavernMigrationPending = synchronizeTavernOffers(this.state);
  }
}
