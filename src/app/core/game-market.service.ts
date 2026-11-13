import { Injectable } from '@angular/core';
import { reconcileProductionAssignments, type CityWorkerWorldState } from '../game/city-worker-core.ts';
import { initializeMarketClaims, identifyNewMarketJob, advanceMarketJobsToReady, takeReadyMarketJob, type MarketClaimWorldState } from '../game/market-claim-core.ts';
import { productionActiveSlots } from '../game/city-production-capacity-core.ts';
import { type CityLayoutWorldState } from '../game/city-layout-core.ts';
import { getMaterialDisplayNameById, getMaterialIdByName, type WeaponSlot } from '../game/game-core';
import { materialSellDataById, weaponSellData } from '../game/economy-core';
import { getWeaponEquipLocation, type EquipmentCharacterLike } from '../game/equipment-core';
import {
  addMaterialQuantityById,
  getMaterialQuantityById,
  takeMaterialQuantityById,
  type MaterialStorageInventory
} from '../game/material-storage-core';
import {
  cancelMarketJob,
  enqueueMarketJob,
  hasMarketCapacity,
  normalizeMarketMaterialJob,
  normalizeMarketMaterialJobs,
  type MarketJob,
  type MarketStateLike
} from '../game/market-core';
import { GameStateService, type MutableGameState } from './game-state.service';

export type MarketMaterialStartResult =
  | { status: 'no-stock' }
  | { status: 'unknown-material' }
  | { status: 'full' }
  | { status: 'started' | 'queued'; materialId: number; name: string; quantity: number; valueNickel: number };

export type MarketWeaponStartResult =
  | { status: 'not-found' }
  | { status: 'starter' }
  | { status: 'equipped' }
  | { status: 'full' }
  | { status: 'started' | 'queued'; name: string; valueNickel: number };

export interface MarketCancelResult { name: string; }
export interface MarketCompletedSale { name: string; valueNickel: number; }
export interface MarketUpdateResult { completedCount: number; completedSales: MarketCompletedSale[]; }

interface RuntimeMarketUpgrades { marketSlots: number; marketQueue: number; }
interface RuntimeMarketWeapon {
  id: number;
  name: string;
  valueNickel: number;
  slots?: readonly WeaponSlot[] | null;
  starter?: boolean;
}

type RuntimeMarketState = MutableGameState & CityLayoutWorldState & CityWorkerWorldState & MarketClaimWorldState & {
  inventory: MaterialStorageInventory;
  weaponInventory: RuntimeMarketWeapon[];
  characters: EquipmentCharacterLike[];
  upgrades: RuntimeMarketUpgrades;
  gold: number;
};

interface LegacyMarketCompatibilityBridge {
  hasCapacity(): boolean;
  startMaterial(name: string, quantity?: number, at?: number): MarketMaterialStartResult;
  startWeapon(weaponId: number, at?: number): MarketWeaponStartResult;
  cancel(kind: 'active' | 'queue', index: number, at?: number): MarketCancelResult | null;
}

declare global {
  interface Window { NoBrainerMarketCompatibility?: LegacyMarketCompatibilityBridge; }
}

@Injectable({ providedIn: 'root' })
export class GameMarketService {
  constructor(private readonly gameState: GameStateService) {}

  hasCapacity(): boolean {
    const state = this.getState();
    return hasMarketCapacity(state, productionActiveSlots(state, 'market'), Number(state.upgrades.marketQueue) || 0);
  }

  /** Aktiver Angular-Pfad: Materialverkäufe werden ausschließlich über die stabile ID gestartet. */
  startMaterialById(materialId: number, quantity = 1, at = Date.now()): MarketMaterialStartResult {
    const state = this.getState();
    const unit = materialSellDataById(materialId);
    if (!unit) return { status: 'unknown-material' };

    const stock = getMaterialQuantityById(state.inventory, unit.materialId);
    if (stock <= 0) return { status: 'no-stock' };

    if (!this.hasCapacity()) return { status: 'full' };
    const qty = Math.max(1, Math.min(stock, Math.floor(Number(quantity) || 1)));
    const job: MarketJob = {
      type: 'material',
      materialId: unit.materialId,
      quantity: qty,
      valueNickel: unit.valueNickel * qty,
      seconds: unit.seconds * qty,
      unitValueNickel: unit.valueNickel,
      unitSeconds: unit.seconds
    };
    const status = enqueueMarketJob(
      state,
      identifyNewMarketJob(state, job),
      productionActiveSlots(state, 'market'),
      Number(state.upgrades.marketQueue) || 0,
      at
    );
    if (status === 'full') return { status: 'full' };
    if (status === 'started') reconcileProductionAssignments(state,'market',at);
    const stored = status === 'started' ? state.marketJobs.at(-1) : state.marketQueue.at(-1);
    if (stored && 'status' in stored) (stored as { status: string }).status = status === 'started' ? 'active' : 'queued';

    if (!takeMaterialQuantityById(state.inventory, unit.materialId, qty)) {
      throw new Error(`Materialbestand änderte sich während einer synchronen Marktauftragserstellung: ID ${unit.materialId}.`);
    }
    return { status, materialId: unit.materialId, name: unit.name, quantity: qty, valueNickel: job.valueNickel };
  }

  startWeapon(weaponId: number, at = Date.now()): MarketWeaponStartResult {
    const state = this.getState();
    const weapon = state.weaponInventory.find(entry => entry.id === weaponId);
    if (!weapon) return { status: 'not-found' };
    if (weapon.starter) return { status: 'starter' };
    if (getWeaponEquipLocation(state.characters, weaponId)) return { status: 'equipped' };
    const sale = weaponSellData(weapon);
    if (!sale) return { status: 'not-found' };
    if (!this.hasCapacity()) return { status: 'full' };
    const job: MarketJob = { ...sale, weaponSnapshot: weapon };
    const status = enqueueMarketJob(state, identifyNewMarketJob(state, job), productionActiveSlots(state, 'market'), Number(state.upgrades.marketQueue) || 0, at);
    if (status === 'full') return { status: 'full' };
    const stored = status === 'started' ? state.marketJobs.at(-1) : state.marketQueue.at(-1);
    if (stored && 'status' in stored) (stored as { status: string }).status = status === 'started' ? 'active' : 'queued';
    state.weaponInventory = state.weaponInventory.filter(entry => entry.id !== weaponId);
    return { status, name: weapon.name, valueNickel: job.valueNickel };
  }

  displayName(job: MarketJob): string {
    if (job.type === 'material') {
      const displayName = getMaterialDisplayNameById(job.materialId);
      return displayName ?? `Material #${Number(job.materialId) || '?'}`;
    }
    return job.name || 'Waffe';
  }

  cancel(kind: 'active' | 'queue', index: number, at = Date.now()): MarketCancelResult | null {
    const state = this.getState();
    const job = cancelMarketJob(state, kind, index, productionActiveSlots(state, 'market'), at);
    if (!job) return null;
    initializeMarketClaims(state); // A promoted queued order is active after cancellation.
    reconcileProductionAssignments(state,'market',at);
    normalizeMarketMaterialJob(job);
    const name = this.displayName(job);
    this.returnJob(state, job);
    return { name };
  }

  /** Migriert laufende/wartende Altaufträge auf stabile Material-IDs und entfernt persistierte Anzeigenamen. */
  normalizeMaterialReferences(): number {
    const state = this.getState();
    return normalizeMarketMaterialJobs({marketJobs:[...state.marketJobs,...(state.marketReadyJobs ?? [])],marketQueue:state.marketQueue});
  }

  update(now = Date.now()): MarketUpdateResult {
    const state = this.getState();
    this.normalizeMaterialReferences();
    reconcileProductionAssignments(state,'market',now);
    const completedSales: MarketCompletedSale[] = [];
    const completedCount = advanceMarketJobsToReady(state, productionActiveSlots(state, 'market'), now, (job) => {
      completedSales.push({ name: this.displayName(job), valueNickel: job.valueNickel });
    }, (_job,at)=>{ reconcileProductionAssignments(state,'market',at); });
    return { completedCount, completedSales };
  }

  initializeClaims(): boolean { return initializeMarketClaims(this.getState()); }

  claim(jobId: string): MarketCompletedSale | null {
    const state = this.getState();
    initializeMarketClaims(state);
    const job = state.marketReadyJobs?.find(item => item.jobId === jobId && item.status === 'ready');
    if (!job) return null;
    if (!Number.isSafeInteger(job.valueNickel) || job.valueNickel < 0 ||
        !Number.isSafeInteger(state.gold) || !Number.isSafeInteger(state.gold + job.valueNickel)) {
      throw new Error('S15: Markt-Auszahlung überschreitet den sicheren Nickelbereich.');
    }
    const claimed = takeReadyMarketJob(state, jobId);
    if (!claimed) return null;
    state.gold += claimed.valueNickel;
    return { name: this.displayName(claimed), valueNickel: claimed.valueNickel };
  }

  claimAll(): MarketCompletedSale[] {
    const state = this.getState();
    initializeMarketClaims(state);
    const ready = state.marketReadyJobs ?? [];
    // Validate the complete payout before changing any order or Nickel balance.
    let total = state.gold;
    if (!Number.isSafeInteger(total)) throw new Error('S15: Ungültiger Nickelbestand.');
    for (const job of ready) {
      if (!Number.isSafeInteger(job.valueNickel) || job.valueNickel < 0 ||
          !Number.isSafeInteger(total + job.valueNickel)) {
        throw new Error('S15: Gesamtauszahlung überschreitet den sicheren Nickelbereich.');
      }
      total += job.valueNickel;
    }
    const ids = ready.map(job => job.jobId);
    const paid: MarketCompletedSale[] = [];
    for (const id of ids) {
      const sale = this.claim(id);
      if (sale) paid.push(sale);
    }
    return paid;
  }

  openLegacyCompatibilityBridge(): void {
    if (window.NoBrainerMarketCompatibility) throw new Error('NoBrainer-Markt-Kompatibilitätsbrücke ist bereits geöffnet.');
    window.NoBrainerMarketCompatibility = {
      hasCapacity: () => this.hasCapacity(),
      startMaterial: (name, quantity, at) => {
        const materialId = getMaterialIdByName(name);
        return materialId === null
          ? { status: 'unknown-material' }
          : this.startMaterialById(materialId, quantity, at);
      },
      startWeapon: (weaponId, at) => this.startWeapon(weaponId, at),
      cancel: (kind, index, at) => this.cancel(kind, index, at)
    };
  }

  closeLegacyCompatibilityBridge(): void { delete window.NoBrainerMarketCompatibility; }

  private getState(): RuntimeMarketState { return this.gameState.getState<RuntimeMarketState>(); }

  private returnJob(state: RuntimeMarketState, job: MarketJob): void {
    if (job.type === 'material') {
      const materialId = job.materialId;
      if (materialId === null || materialId === undefined) throw new Error('Unbekannte Material-ID im Marktauftrag.');
      const returned = addMaterialQuantityById(state.inventory, materialId, job.quantity || 1);
      if (!returned) throw new Error(`Material-ID ${materialId} konnte nicht ins Inventar zurückgegeben werden.`);
      return;
    }
    if (job.weaponSnapshot) state.weaponInventory.unshift(job.weaponSnapshot as RuntimeMarketWeapon);
  }
}
