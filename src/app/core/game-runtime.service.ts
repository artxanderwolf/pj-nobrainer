import { GameMissionService } from './game-mission.service';
import { type CityConstructionWorldState } from '../game/city-construction-core.ts';
import { replayProductionConstructionMilestones } from '../game/city-production-capacity-core.ts';
import { Injectable } from '@angular/core';
import { formatCurrencyNickel } from '../game/economy-core';
import { normalizeMaterialInventory, type MaterialStorageInventory } from '../game/material-storage-core';
import { OfflineProgressService, SaveSnapshot } from './offline-progress.service';
import { SaveStorageService } from './save-storage.service';
import { GameCharacterPresentationService } from './game-character-presentation.service';
import { GameCombatLogService } from './game-combat-log.service';
import { GameDungeonEquipmentSyncService } from './game-dungeon-equipment-sync.service';
import { GameDungeonService, type DungeonActionResult } from './game-dungeon.service';
import { GameDungeonPresentationService } from './game-dungeon-presentation.service';
import { GameDungeonSessionService } from './game-dungeon-session.service';
import { GameEquipmentService } from './game-equipment.service';
import { GameEnergyService } from './game-energy.service';
import { GameForgeJobPresentationService } from './game-forge-job-presentation.service';
import { GameForgePreviewPresentationService } from './game-forge-preview-presentation.service';
import { GameForgeService } from './game-forge.service';
import { GameMarketService } from './game-market.service';
import { GameResourcePresentationService } from './game-resource-presentation.service';
import { GameSaveTransferService } from './game-save-transfer.service';
import { GameAndroidBackService } from './game-android-back.service';
import { GameStateService, type MutableGameState } from './game-state.service';
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
  private equipmentRepairMessages: string[] = [];
  private lastCityConstructionSecond = -1;

  constructor(
    private readonly saveStorage: SaveStorageService,
    private readonly offlineProgress: OfflineProgressService,
    private readonly gameState: GameStateService,
    private readonly characterPresentation: GameCharacterPresentationService,
    private readonly weaponInventoryPresentation: GameWeaponInventoryPresentationService,
    private readonly resourcePresentation: GameResourcePresentationService,
    private readonly forgeJobPresentation: GameForgeJobPresentationService,
    private readonly forgePreviewPresentation: GameForgePreviewPresentationService,
    private readonly combatLog: GameCombatLogService,
    private readonly gameEnergy: GameEnergyService,
    private readonly gameEquipment: GameEquipmentService,
    private readonly gameForge: GameForgeService,
    private readonly gameMarket: GameMarketService,
    private readonly gameDungeon: GameDungeonService,
    private readonly dungeonSession: GameDungeonSessionService,
    private readonly dungeonEquipmentSync: GameDungeonEquipmentSyncService,
    private readonly dungeonPresentation: GameDungeonPresentationService,
    private readonly missions: GameMissionService,
    private readonly saveTransfer: GameSaveTransferService,
    private readonly androidBack: GameAndroidBackService
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
    const dungeonMigrationChanged = this.gameState.consumeDungeonMigration();
    const cityMigrationChanged = this.gameState.consumeCityMigration();
    const equipmentRepairs = this.gameEquipment.normalizeEquipment();
    const equipmentChanged = equipmentRepairs.length > 0;
    if (equipmentChanged) {
      this.equipmentRepairMessages = equipmentRepairs.map(repair => `${repair.characterName}: ${repair.weaponName} – ${repair.reason}`);
      const state = this.gameState.getState<MutableGameState & { teams?: Record<number,{dungeonRun?: { attackPoints:Array<{nextAt:number}> } | null}> }>();
      const nextTimes = Object.values(state.teams??{}).flatMap(d=>d.dungeonRun?.attackPoints??[]).map(point => Number(point.nextAt)).filter(Number.isFinite);
      const repairAt = nextTimes.length ? Math.min(Date.now(), ...nextTimes) : Date.now();
      this.dungeonEquipmentSync.refresh(repairAt);
      runtime.save(false);
    }
    this.missions.prepare(() => runtime.save(false), () => { runtime.renderInitial(); this.forgePreviewPresentation.render(); this.dungeonPresentation.render(); });
    this.saveTransfer.bindActions(() => runtime.save(true));
    this.androidBack.bind();
    const materialStorageChanged = this.normalizeMaterialStorage() > 0;
    const dungeonMaterialReferencesChanged = this.gameDungeon.normalizeMaterialReferences() > 0;
    const forgeClaimMigrationChanged = this.gameForge.initializeClaims();
    const forgeMaterialReferencesChanged = this.gameForge.normalizeMaterialReferences() > 0;
    const marketMaterialReferencesChanged = this.gameMarket.normalizeMaterialReferences() > 0;
    const materialReferencesChanged = materialStorageChanged || dungeonMaterialReferencesChanged || forgeMaterialReferencesChanged || marketMaterialReferencesChanged;
    this.forgeJobPresentation.bindActions(() => {
      runtime.save(false);
      this.forgeJobPresentation.render();
      this.forgePreviewPresentation.render();
      this.weaponInventoryPresentation.render();
      runtime.renderMarketWeapons();
    });
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

    // Moderne Dungeon-Sitzungen mit persistierter Endzeit bleiben beim Laden aktiv.
    // Alte oder verwaiste Laufzustände ohne belastbare Endzeit werden einmalig bereinigt.
    const dungeonSessionPreparation = this.dungeonSession.prepareLoadedSession(Date.now());
    this.applyDungeonResult(runtime, dungeonSessionPreparation);

    // S13: Eine offline fertiggestellte Schmiede / ein Markt übernimmt die
    // gemeinsame Queue ab seinem tatsächlichen Bau-Endzeitpunkt.
    const offlineProduction = this.replayCityProduction(Date.now());
    const constructionCompleted = offlineProduction.constructionCompleted;
    const forgeUpdate = this.gameForge.update();
    this.logForgeCompletions(forgeUpdate.completedNames);
    const marketUpdate = this.gameMarket.update();
    this.logMarketCompletions(marketUpdate.completedSales);
    const dungeonUpdate = this.dungeonSession.update();
    this.applyDungeonResult(runtime, dungeonUpdate);
    this.gameEnergy.update();
    this.missions.render();

    if (before && this.offlineProgress.shouldShowSummary(before)) {
      runtime.save(false);
      const after = this.saveStorage.readSnapshot();
      if (after) this.offlineProgress.showSummary(before, after);
    } else if (equipmentChanged || materialReferencesChanged || dungeonSessionPreparation.saveRequested || dungeonMigrationChanged || cityMigrationChanged || constructionCompleted || forgeClaimMigrationChanged) {
      runtime.save(false);
    }

    this.registerVisibilityHandler();
  }

  startTick(): void {
    if (this.tickHandle !== null) return;
    this.scheduleNextTick();
  }

  renderInitial(): void {
    this.getRuntime().renderInitial();
    this.missions.render();
    this.resourcePresentation.render();
    this.forgePreviewPresentation.render();
    this.forgeJobPresentation.render();
    this.characterPresentation.render();
    this.weaponInventoryPresentation.render();
    this.dungeonPresentation.render();
    if (this.equipmentRepairMessages.length) {
      const message = 'Ausrüstung an die Klassenregeln angepasst. Abgelegte Waffen bleiben im Lager.\n\n' + this.equipmentRepairMessages.join('\n');
      this.equipmentRepairMessages = [];
      window.setTimeout(() => window.alert(message), 0);
    }
  }

  save(manual = false): boolean {
    return this.getRuntime().save(manual);
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

    const productionReplay = this.replayCityProduction(Date.now());
    const forgeUpdate = this.gameForge.update();
    const forgeCompleted = forgeUpdate.completedCount > 0 || productionReplay.forgeCompleted;
    this.logForgeCompletions(forgeUpdate.completedNames);
    const marketUpdate = this.gameMarket.update();
    const marketCompleted = marketUpdate.completedCount > 0 || productionReplay.marketCompleted;
    this.logMarketCompletions(marketUpdate.completedSales);
    const dungeonUpdate = this.dungeonSession.update();
    this.applyDungeonResult(runtime, dungeonUpdate);
    this.gameEnergy.update();
    this.missions.render();
    const now = Date.now();
    if (productionReplay.constructionCompleted) runtime.save(false);
    const citySecond = Math.floor(now / 1000);
    if (productionReplay.constructionCompleted || citySecond !== this.lastCityConstructionSecond) {
      this.lastCityConstructionSecond = citySecond;
      document.dispatchEvent(new Event('city-construction-updated'));
    }

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

  private replayCityProduction(now: number): { constructionCompleted: boolean; forgeCompleted: boolean; marketCompleted: boolean } {
    let forgeCompleted = false;
    let marketCompleted = false;
    const state = this.gameState.getState<MutableGameState & CityConstructionWorldState>();
    const constructionJobs = replayProductionConstructionMilestones(state, now, at => {
      const forge = this.gameForge.update(at);
      const market = this.gameMarket.update(at);
      if (forge.completedCount) {
        forgeCompleted = true;
        this.logForgeCompletions(forge.completedNames);
      }
      if (market.completedCount) {
        marketCompleted = true;
        this.logMarketCompletions(market.completedSales);
      }
    });
    return { constructionCompleted: constructionJobs.length > 0, forgeCompleted, marketCompleted };
  }

  private logForgeCompletions(completedNames: readonly string[]): void {
    for (const name of completedNames) {
      this.combatLog.add(`Schmiede fertig: ${name} ist zur Abholung bereit.`, 'good');
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
      this.dungeonPresentation.addEvent(event.text, event.className,event.teamId);
    }
    if (inventoryChanged) {
      this.normalizeMaterialStorage();
      this.resourcePresentation.render();
      this.forgePreviewPresentation.render();
      runtime.renderInventoryState();
    }
    if (result.saveRequested || inventoryChanged) runtime.save(false);
    if (result.alertMessage) window.alert(result.alertMessage);
  }

  private normalizeMaterialStorage(): number {
    const state = this.gameState.getState<MutableGameState & { inventory?: MaterialStorageInventory }>();
    const inventory = state.inventory;
    if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory)) return 0;
    return normalizeMaterialInventory(inventory);
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
