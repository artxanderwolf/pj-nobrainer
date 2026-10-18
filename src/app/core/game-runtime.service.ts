import { Injectable } from '@angular/core';
import { formatCurrencyNickel } from '../game/economy-core';
import { OfflineProgressService, SaveSnapshot } from './offline-progress.service';
import { SaveStorageService } from './save-storage.service';
import { GameCharacterPresentationService } from './game-character-presentation.service';
import { GameCombatLogService } from './game-combat-log.service';
import { GameDungeonEquipmentSyncService } from './game-dungeon-equipment-sync.service';
import { GameDungeonService, type DungeonActionResult } from './game-dungeon.service';
import { GameDungeonPresentationService } from './game-dungeon-presentation.service';
import { GameEnergyService } from './game-energy.service';
import { GameForgeJobPresentationService } from './game-forge-job-presentation.service';
import { GameForgePreviewPresentationService } from './game-forge-preview-presentation.service';
import { GameForgeService } from './game-forge.service';
import { GameMarketService } from './game-market.service';
import { GameResourcePresentationService } from './game-resource-presentation.service';
import { GameWeaponInventoryPresentationService } from './game-weapon-inventory-presentation.service';

interface GameSaveStorageAdapter {
  read(): string | null;
  write(value: string): void;
  remove(): void;
}

export interface GameRuntimeApi {
  configureSaveStorage(adapter: GameSaveStorageAdapter): void;
  prepare(): void;
  renderMarketJob(): void;
  renderMarketMaterials(): void;
  renderMarketWeapons(): void;
  renderInventoryState(): void;
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
    private readonly characterPresentation: GameCharacterPresentationService,
    private readonly weaponInventoryPresentation: GameWeaponInventoryPresentationService,
    private readonly resourcePresentation: GameResourcePresentationService,
    private readonly forgeJobPresentation: GameForgeJobPresentationService,
    private readonly forgePreviewPresentation: GameForgePreviewPresentationService,
    private readonly combatLog: GameCombatLogService,
    private readonly gameEnergy: GameEnergyService,
    private readonly gameForge: GameForgeService,
    private readonly gameMarket: GameMarketService,
    private readonly gameDungeon: GameDungeonService,
    private readonly dungeonEquipmentSync: GameDungeonEquipmentSyncService,
    private readonly dungeonPresentation: GameDungeonPresentationService
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
    this.characterPresentation.bindActions(() => {
      this.dungeonEquipmentSync.refresh();
      this.weaponInventoryPresentation.render();
      runtime.renderMarketWeapons();
    });
    this.weaponInventoryPresentation.bindActions(() => {
      this.dungeonEquipmentSync.refresh();
      this.characterPresentation.render();
      runtime.renderMarketWeapons();
    });
    this.dungeonPresentation.bindActions((result, inventoryChanged) => this.applyDungeonResult(runtime, result, inventoryChanged));
    this.gameEnergy.update();
    const forgeUpdate = this.gameForge.update();
    this.logForgeCompletions(forgeUpdate.completedNames);
    const marketUpdate = this.gameMarket.update();
    this.logMarketCompletions(marketUpdate.completedSales);
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
    this.resourcePresentation.render();
    this.forgePreviewPresentation.render();
    this.forgeJobPresentation.render();
    this.characterPresentation.render();
    this.weaponInventoryPresentation.render();
    this.dungeonPresentation.render();
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
      'renderMarketJob',
      'renderMarketMaterials',
      'renderMarketWeapons',
      'renderInventoryState',
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
    this.logForgeCompletions(forgeUpdate.completedNames);
    const marketUpdate = this.gameMarket.update();
    const marketCompleted = marketUpdate.completedCount > 0;
    this.logMarketCompletions(marketUpdate.completedSales);
    const dungeonUpdate = this.gameDungeon.update();
    this.applyDungeonResult(runtime, dungeonUpdate);

    this.forgeJobPresentation.render();
    runtime.renderMarketJob();
    this.characterPresentation.renderIfIdle();
    this.dungeonPresentation.render();

    if (forgeCompleted) {
      this.forgePreviewPresentation.render();
      this.weaponInventoryPresentation.render();
    }

    if (marketCompleted) {
      runtime.renderMarketMaterials();
      runtime.renderMarketWeapons();
      this.resourcePresentation.render();
    }

    if (runtime.shouldAutoSave(Date.now())) runtime.save(false);
  }

  private logForgeCompletions(completedNames: readonly string[]): void {
    for (const name of completedNames) {
      this.combatLog.add(`Schmiede fertig: ${name} wurde dem Waffeninventar hinzugefügt.`, 'good');
    }
  }

  private logMarketCompletions(
    completedSales: readonly { name: string; valueNickel: number }[]
  ): void {
    for (const sale of completedSales) {
      this.combatLog.add(
        `Verkauf abgeschlossen: ${sale.name} → ${formatCurrencyNickel(sale.valueNickel)}.`,
        'good'
      );
    }
  }

  private applyDungeonResult(runtime: GameRuntimeApi, result: DungeonActionResult, inventoryChanged = false): void {
    for (const event of result.events) {
      this.combatLog.add(event.text, event.className);
    }
    if (inventoryChanged) {
      this.resourcePresentation.render();
      this.forgePreviewPresentation.render();
      runtime.renderInventoryState();
    }
    if (result.saveRequested || inventoryChanged) runtime.save(false);
    if (result.alertMessage) window.alert(result.alertMessage);
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
