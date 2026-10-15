import { Injectable } from '@angular/core';
import { formatCurrencyNickel } from '../game/economy-core';
import { OfflineProgressService, SaveSnapshot } from './offline-progress.service';
import { SaveStorageService } from './save-storage.service';
import { GameDungeonService, type DungeonActionResult } from './game-dungeon.service';
import { GameEnergyService } from './game-energy.service';
import { GameForgeService } from './game-forge.service';
import { GameMarketService } from './game-market.service';

interface GameSaveStorageAdapter {
  read(): string | null;
  write(value: string): void;
  remove(): void;
}

export interface GameRuntimeApi {
  configureSaveStorage(adapter: GameSaveStorageAdapter): void;
  prepare(): void;
  renderForgeJob(): void;
  renderMarketJob(): void;
  renderForgePreview(): void;
  renderWeaponInventory(): void;
  renderMarketMaterials(): void;
  renderMarketWeapons(): void;
  refreshGold(): void;
  renderRosterIfIdle(): void;
  addLog(text: string, className?: string): void;
  shouldAutoSave(now: number): boolean;
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
    private readonly offlineProgress: OfflineProgressService,
    private readonly gameEnergy: GameEnergyService,
    private readonly gameForge: GameForgeService,
    private readonly gameMarket: GameMarketService,
    private readonly gameDungeon: GameDungeonService
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
    this.gameEnergy.update();
    const forgeUpdate = this.gameForge.update();
    this.logForgeCompletions(runtime, forgeUpdate.completedNames);
    const marketUpdate = this.gameMarket.update();
    this.logMarketCompletions(runtime, marketUpdate.completedSales);
    const dungeonUpdate = this.gameDungeon.update();
    this.applyDungeonResult(runtime, dungeonUpdate);
    this.gameEnergy.update();

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
    this.gameDungeon.renderPresentation();
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
      'renderForgeJob',
      'renderMarketJob',
      'renderForgePreview',
      'renderWeaponInventory',
      'renderMarketMaterials',
      'renderMarketWeapons',
      'refreshGold',
      'renderRosterIfIdle',
      'addLog',
      'shouldAutoSave',
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
      this.runTickCycle();
      if (this.tickHandle !== null) this.scheduleNextTick();
    }, 250);
  }

  private runTickCycle(): void {
    const runtime = this.getRuntime();

    this.gameEnergy.update();
    const forgeUpdate = this.gameForge.update();
    const forgeCompleted = forgeUpdate.completedCount > 0;
    this.logForgeCompletions(runtime, forgeUpdate.completedNames);
    const marketUpdate = this.gameMarket.update();
    const marketCompleted = marketUpdate.completedCount > 0;
    this.logMarketCompletions(runtime, marketUpdate.completedSales);
    const dungeonUpdate = this.gameDungeon.update();
    this.applyDungeonResult(runtime, dungeonUpdate);

    runtime.renderForgeJob();
    runtime.renderMarketJob();
    this.gameDungeon.renderPresentation();

    if (forgeCompleted) {
      runtime.renderForgePreview();
      runtime.renderWeaponInventory();
    }

    if (marketCompleted) {
      runtime.renderMarketMaterials();
      runtime.renderMarketWeapons();
      runtime.refreshGold();
    }

    runtime.renderRosterIfIdle();
    if (runtime.shouldAutoSave(Date.now())) runtime.save(false);
  }

  private logForgeCompletions(runtime: GameRuntimeApi, completedNames: readonly string[]): void {
    for (const name of completedNames) {
      runtime.addLog(`Schmiede fertig: ${name} wurde dem Waffeninventar hinzugefügt.`, 'good');
    }
  }

  private logMarketCompletions(
    runtime: GameRuntimeApi,
    completedSales: readonly { name: string; valueNickel: number }[]
  ): void {
    for (const sale of completedSales) {
      runtime.addLog(
        `Verkauf abgeschlossen: ${sale.name} → ${formatCurrencyNickel(sale.valueNickel)}.`,
        'good'
      );
    }
  }

  private applyDungeonResult(runtime: GameRuntimeApi, result: DungeonActionResult): void {
    for (const event of result.events) {
      runtime.addLog(event.text, event.className);
    }
    if (result.saveRequested) runtime.save(false);
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

      this.runTickCycle();
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
