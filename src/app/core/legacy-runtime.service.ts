import { Injectable } from '@angular/core';
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

  constructor(private readonly saveStorage: SaveStorageService) {}

  prepare(): void {
    const runtime = this.getRuntime();
    runtime.configureSaveStorage({
      read: () => this.saveStorage.read(),
      write: (value: string) => this.saveStorage.write(value),
      remove: () => this.saveStorage.remove()
    });
    runtime.prepare();
  }

  startTick(): void {
    if (this.tickHandle !== null) {
      return;
    }

    const runtime = this.getRuntime();
    this.tickHandle = window.setInterval(() => runtime.tick(), 250);
  }

  renderInitial(): void {
    this.getRuntime().renderInitial();
  }

  stopTick(): void {
    if (this.tickHandle === null) {
      return;
    }

    window.clearInterval(this.tickHandle);
    this.tickHandle = null;
  }

  private getRuntime(): NoBrainerLegacyRuntime {
    const runtime = window.NoBrainerLegacyRuntime;
    if (!runtime) {
      throw new Error('NoBrainer-Legacy-Runtime wurde nicht registriert.');
    }
    return runtime;
  }
}
