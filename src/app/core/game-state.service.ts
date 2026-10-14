import { Injectable } from '@angular/core';

export type MutableGameState = Record<string, unknown>;

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

  getState(): Readonly<MutableGameState> {
    if (!this.initialized) {
      throw new Error('NoBrainer-Spielzustand wurde noch nicht initialisiert.');
    }
    return this.state;
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

    for (const key of Object.keys(this.state)) delete this.state[key];
    Object.assign(this.state, nextState);
  }
}
