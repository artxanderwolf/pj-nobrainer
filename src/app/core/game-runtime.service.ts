import { Injectable } from '@angular/core';
import { OfflineProgressService, SaveSnapshot } from './offline-progress.service';
import { SaveStorageService } from './save-storage.service';

interface GameSaveStorageAdapter {
  read(): string | null;
  write(value: string): void;
  remove(): void;
}

export interface GameRuntimeApi {
  configureSaveStorage(adapter: GameSaveStorageAdapter): void;
  prepare(): void;
  tick(): void;
  renderInitial(): void;
  save(manual?: boolean): boolean;
  resetSave(): void;
}

interface GameRuntimeBootstrap {
  register(runtime: GameRuntimeApi): void;
}

declare global {
  interface Window {
    NoBrainerRuntimeBootstrap?: GameRuntimeBootstrap;
  }
}

@Injectable({ providedIn: 'root' })
export class GameRuntimeService {
  private runtime: GameRuntimeApi | null = null;
  private tickHandle: number | null = null;
  private hiddenSnapshot: SaveSnapshot | null = null;
  private visibilityHandlerRegistered = false;

  constructor(
    private readonly saveStorage: SaveStorageService,
    private readonly offlineProgress: OfflineProgressService
  ) {}

  openBootstrapRegistration(): void {
    if (window.NoBrainerRuntimeBootstrap) {
      throw new Error('NoBrainer-Runtime-Bootstrap ist bereits geöffnet.');
    }

    window.NoBrainerRuntimeBootstrap = {
      register: (runtime: GameRuntimeApi) => this.registerRuntime(runtime)
    };
  }

  closeBootstrapRegistration(): void {
    delete window.NoBrainerRuntimeBootstrap;
  }

  prepare(): void {
    const runtime = this.getRuntime();
    runtime.configureSaveStorage({
      read: () => this.saveStorage.read(),
      write: (value: string) => this.saveStorage.write(value),
      remove: () => this.saveStorage.remove()
    });

    const before = this.saveStorage.readSnapshot();
    runtime.prepare();

    if (before && this.offlineProgress.shouldShowSummary(before)) {
      runtime.save(false);
      const after = this.saveStorage.readSnapshot();
      if (after) this.offlineProgress.showSummary(before, after);
    }

    this.registerVisibilityHandler();
  }

  startTick(): void {
    if (this.tickHandle !== null) return;
    this.scheduleNextTick();
  }

  renderInitial(): void {
    this.getRuntime().renderInitial();
  }

  stopTick(): void {
    if (this.tickHandle === null) return;
    window.clearTimeout(this.tickHandle);
    this.tickHandle = null;
  }

  private registerRuntime(runtime: GameRuntimeApi): void {
    if (this.runtime) throw new Error('NoBrainer-Runtime wurde bereits registriert.');
    this.assertRuntimeApi(runtime);
    this.runtime = runtime;
  }

  private assertRuntimeApi(runtime: GameRuntimeApi): void {
    const required: Array<keyof GameRuntimeApi> = [
      'configureSaveStorage',
      'prepare',
      'tick',
      'renderInitial',
      'save',
      'resetSave'
    ];

    for (const key of required) {
      if (typeof runtime?.[key] !== 'function') {
        throw new Error(`NoBrainer-Runtime stellt ${String(key)} nicht bereit.`);
      }
    }
  }

  private scheduleNextTick(): void {
    this.tickHandle = window.setTimeout(() => {
      this.getRuntime().tick();
      if (this.tickHandle !== null) this.scheduleNextTick();
    }, 250);
  }

  private registerVisibilityHandler(): void {
    if (this.visibilityHandlerRegistered) return;
    this.visibilityHandlerRegistered = true;

    document.addEventListener('visibilitychange', () => {
      const runtime = this.getRuntime();
      if (document.hidden) {
        runtime.save(false);
        this.hiddenSnapshot = this.saveStorage.readSnapshot();
        return;
      }

      const before = this.hiddenSnapshot;
      this.hiddenSnapshot = null;
      if (!before || !this.offlineProgress.shouldShowSummary(before)) return;

      runtime.tick();
      runtime.save(false);
      const after = this.saveStorage.readSnapshot();
      if (after) this.offlineProgress.showSummary(before, after);
    });
  }

  private getRuntime(): GameRuntimeApi {
    if (!this.runtime) throw new Error('NoBrainer-Runtime wurde noch nicht bei Angular registriert.');
    return this.runtime;
  }
}
