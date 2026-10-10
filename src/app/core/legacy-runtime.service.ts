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

interface SaveSnapshot {
  savedAt: number | null;
  state: any;
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

  constructor(private readonly saveStorage: SaveStorageService) {}

  prepare(): void {
    const runtime = this.getRuntime();
    runtime.configureSaveStorage({
      read: () => this.saveStorage.read(),
      write: (value: string) => this.saveStorage.write(value),
      remove: () => this.saveStorage.remove()
    });

    const before = this.readSnapshot();
    runtime.prepare();

    if (before && this.shouldShowOfflineSummary(before)) {
      // Persist the fully caught-up state so the comparison includes every
      // autonomous system that was advanced during runtime preparation.
      runtime.save(false);
      const after = this.readSnapshot();
      if (after) {
        this.showOfflineSummary(before, after);
      }
    }

    this.registerVisibilityHandler();
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

  private registerVisibilityHandler(): void {
    if (this.visibilityHandlerRegistered) return;
    this.visibilityHandlerRegistered = true;

    document.addEventListener('visibilitychange', () => {
      const runtime = this.getRuntime();

      if (document.hidden) {
        // Save at the moment the game leaves the foreground. This gives the
        // return summary a stable baseline even if the browser keeps ticking.
        runtime.save(false);
        this.hiddenSnapshot = this.readSnapshot();
        return;
      }

      const before = this.hiddenSnapshot;
      this.hiddenSnapshot = null;
      if (!before || !this.shouldShowOfflineSummary(before)) return;

      // Run one immediate catch-up tick before comparing. This covers both
      // throttled/suspended tabs and browsers that continued running timers.
      runtime.tick();
      runtime.save(false);
      const after = this.readSnapshot();
      if (after) {
        this.showOfflineSummary(before, after);
      }
    });
  }

  private readSnapshot(): SaveSnapshot | null {
    const raw = this.saveStorage.read();
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      const state = parsed?.state ?? parsed;
      const savedAt = Number(parsed?.savedAt);
      return {
        state,
        savedAt: Number.isFinite(savedAt) ? savedAt : null
      };
    } catch {
      return null;
    }
  }

  private shouldShowOfflineSummary(snapshot: SaveSnapshot): boolean {
    if (!snapshot.savedAt || Date.now() - snapshot.savedAt < 10_000) return false;

    const state = snapshot.state ?? {};
    const characters = Array.isArray(state.characters) ? state.characters : [];
    const energyCanRegenerate = !state.dungeonAuto && characters.some((c: any) => Number(c.energy) < Number(c.maxEnergy));

    return Boolean(
      state.dungeonAuto ||
      state.dungeonRun ||
      state.dungeonSearch ||
      state.dungeonLootCollect ||
      state.forgeJobs?.length ||
      state.forgeQueue?.length ||
      state.marketJobs?.length ||
      state.marketQueue?.length ||
      energyCanRegenerate
    );
  }

  private showOfflineSummary(before: SaveSnapshot, after: SaveSnapshot): void {
    if (!before.savedAt) return;

    const elapsedMs = Math.max(0, Date.now() - before.savedAt);
    const beforeState = before.state ?? {};
    const afterState = after.state ?? {};
    const lines: string[] = [`Abwesend: ${this.formatDuration(elapsedMs)}`];

    const waves = Math.max(0, Number(afterState.dungeonWavesDefeated || 0) - Number(beforeState.dungeonWavesDefeated || 0));
    if (waves > 0) lines.push(`Dungeon: ${waves} Welle${waves === 1 ? '' : 'n'} besiegt`);

    const lootChanges = this.quantityChanges(beforeState.dungeonLoot, afterState.dungeonLoot);
    if (lootChanges.length) lines.push(`Dungeon-Beute: ${lootChanges.join(', ')}`);

    const weaponsBefore = Array.isArray(beforeState.weaponInventory) ? beforeState.weaponInventory.length : 0;
    const weaponsAfter = Array.isArray(afterState.weaponInventory) ? afterState.weaponInventory.length : 0;
    const forged = Math.max(0, weaponsAfter - weaponsBefore);
    if (forged > 0) lines.push(`Schmiede: ${forged} Waffe${forged === 1 ? '' : 'n'} fertiggestellt`);

    const goldGain = Number(afterState.gold || 0) - Number(beforeState.gold || 0);
    if (goldGain > 0) lines.push(`Markt: +${this.formatCurrencyNickel(goldGain)}`);

    const energyGain = this.totalCharacterDelta(beforeState.characters, afterState.characters, 'energy');
    if (energyGain > 0.05) lines.push(`Energie regeneriert: +${this.formatNumber(energyGain)}`);

    const hpGain = this.totalCharacterDelta(beforeState.characters, afterState.characters, 'hp');
    if (hpGain > 0.05) lines.push(`HP regeneriert: +${this.formatNumber(hpGain)}`);

    if (lines.length === 1) {
      lines.push('Keine abgeschlossenen automatischen Vorgänge.');
    }

    window.alert(`Offline-Fortschritt\n\n${lines.join('\n')}`);
  }

  private quantityChanges(before: any, after: any): string[] {
    const names = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
    const changes: string[] = [];
    for (const name of names) {
      const oldQty = Number(before?.[name]?.qty || 0);
      const newQty = Number(after?.[name]?.qty || 0);
      const delta = newQty - oldQty;
      if (delta > 0) changes.push(`${name} +${this.formatNumber(delta)}`);
    }
    return changes;
  }

  private totalCharacterDelta(before: any, after: any, field: 'energy' | 'hp'): number {
    const beforeById = new Map((Array.isArray(before) ? before : []).map((c: any) => [Number(c.id), Number(c[field] || 0)]));
    return (Array.isArray(after) ? after : []).reduce((sum: number, c: any) => {
      const previous = beforeById.get(Number(c.id));
      return previous === undefined ? sum : sum + Math.max(0, Number(c[field] || 0) - previous);
    }, 0);
  }

  private formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours} Std. ${minutes} Min.`;
    if (minutes > 0) return `${minutes} Min. ${seconds} Sek.`;
    return `${seconds} Sek.`;
  }

  private formatCurrencyNickel(value: number): string {
    let remaining = Math.max(0, Math.round(value));
    const gold = Math.floor(remaining / 1_000_000); remaining %= 1_000_000;
    const silver = Math.floor(remaining / 10_000); remaining %= 10_000;
    const bronze = Math.floor(remaining / 100); remaining %= 100;
    const parts: string[] = [];
    if (gold) parts.push(`${gold} Gold`);
    if (silver) parts.push(`${silver} Silber`);
    if (bronze) parts.push(`${bronze} Bronze`);
    if (remaining || !parts.length) parts.push(`${remaining} Nickel`);
    return parts.join(' ');
  }

  private formatNumber(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
  }

  private getRuntime(): NoBrainerLegacyRuntime {
    const runtime = window.NoBrainerLegacyRuntime;
    if (!runtime) {
      throw new Error('NoBrainer-Legacy-Runtime wurde nicht registriert.');
    }
    return runtime;
  }
}
