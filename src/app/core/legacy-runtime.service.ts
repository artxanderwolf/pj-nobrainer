import { Injectable } from '@angular/core';
import { OfflineProgressService, SaveSnapshot } from './offline-progress.service';
import { SaveStorageService } from './save-storage.service';

interface LegacySaveStorageAdapter {
  read(): string | null;
  write(value: string): void;
  remove(): void;
}

interface NoBrainerLegacyRuntime {
  configureSaveStorage(adapter: LegacySaveStorageAdapter): void;
  prepare(): void;
  tick(): void;
  renderInitial(): void;
  save(manual?: boolean): boolean;
  resetSave(): void;
}

declare global {
  interface Window {
    NoBrainerLegacyRuntime?: NoBrainerLegacyRuntime;
  }
}

@Injectable({ providedIn: 'root' })
export class LegacyRuntimeService {
  private tickHandle: number | null = null;
  private hiddenSnapshot: SaveSnapshot | null = null;
  private visibilityHandlerRegistered = false;

  constructor(
    private readonly saveStorage: SaveStorageService,
    private readonly offlineProgress: OfflineProgressService
  ) {}

  prepare(): void {
    const runtime = this.getRuntime();
    runtime.configureSaveStorage({
      read: () => this.saveStorage.read(),
      write: (value: string) => this.saveStorage.write(value),
      remove: () => this.saveStorage.remove()
    });

    const before = this.readSnapshot();
    runtime.prepare();

    if (before && this.offlineProgress.shouldShowSummary(before)) {
      runtime.save(false);
      const after = this.readSnapshot();
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
        this.hiddenSnapshot = this.readSnapshot();
        return;
      }

      const before = this.hiddenSnapshot;
      this.hiddenSnapshot = null;
      if (!before || !this.offlineProgress.shouldShowSummary(before)) return;

      runtime.tick();
      runtime.save(false);
      const after = this.readSnapshot();
      if (after) this.offlineProgress.showSummary(before, after);
    });
  }

  private readSnapshot(): SaveSnapshot | null {
    const raw = this.saveStorage.read();
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      const state = parsed?.state ?? parsed;
      const savedAt = Number(parsed?.savedAt);
      return { state, savedAt: Number.isFinite(savedAt) ? savedAt : null };
    } catch {
      return null;
    }
  }

  private getRuntime(): NoBrainerLegacyRuntime {
    const runtime = window.NoBrainerLegacyRuntime;
    if (!runtime) throw new Error('NoBrainer-Legacy-Runtime wurde nicht registriert.');
    return runtime;
  }
}
