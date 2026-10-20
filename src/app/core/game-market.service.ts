import { Injectable } from '@angular/core';
import { getMaterialIdByName, type WeaponSlot } from '../game/game-core';
import { materialSellDataById, weaponSellData } from '../game/economy-core';
import { getWeaponEquipLocation, type EquipmentCharacterLike } from '../game/equipment-core';
import {
  addMaterialQuantityById,
  getMaterialQuantityById,
  takeMaterialQuantityById,
  type MaterialStorageInventory
} from '../game/material-storage-core';
import {
  advanceMarketJobs,
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

type RuntimeMarketState = MutableGameState & MarketStateLike & {
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
    return hasMarketCapacity(state, Number(state.upgrades.marketSlots) || 0, Number(state.upgrades.marketQueue) || 0);
  }

  /** Aktiver Angular-Pfad: Materialverkäufe werden ausschließlich über die stabile ID gestartet. */
  startMaterialById(materialId: number, quantity = 1, at = Date.now()): MarketMaterialStartResult {
    const state = this.getState();
    const unit = materialSellDataById(materialId);
    if (!unit) return { status: 'unknown-material' };

    const stock = getMaterialQuantityById(state.inventory, unit.materialId);
    if (stock <= 0) return { status: 'no-stock' };

    const qty = Math.max(1, Math.min(stock, Math.floor(Number(quantity) || 1)));
    const job: MarketJob = {
      ...unit,
      materialId: unit.materialId,
      quantity: qty,
      valueNickel: unit.valueNickel * qty,
      seconds: unit.seconds * qty,
      unitValueNickel: unit.valueNickel,
      unitSeconds: unit.seconds
    };
    const status = enqueueMarketJob(
      state,
      job,
      Number(state.upgrades.marketSlots) || 0,
      Number(state.upgrades.marketQueue) || 0,
      at
    );
    if (status === 'full') return { status: 'full' };

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
    const job: MarketJob = { ...sale, weaponSnapshot: weapon };
    const status = enqueueMarketJob(state, job, Number(state.upgrades.marketSlots) || 0, Number(state.upgrades.marketQueue) || 0, at);
    if (status === 'full') return { status: 'full' };
    state.weaponInventory = state.weaponInventory.filter(entry => entry.id !== weaponId);
    return { status, name: weapon.name, valueNickel: job.valueNickel };
  }

  cancel(kind: 'active' | 'queue', index: number, at = Date.now()): MarketCancelResult | null {
    const state = this.getState();
    const job = cancelMarketJob(state, kind, index, Number(state.upgrades.marketSlots) || 0, at);
    if (!job) return null;
    normalizeMarketMaterialJob(job);
    this.returnJob(state, job);
    return { name: job.name };
  }

  /** Migriert laufende/wartende Altaufträge auf stabile Material-IDs. */
  normalizeMaterialReferences(): number {
    return normalizeMarketMaterialJobs(this.getState());
  }

  update(now = Date.now()): MarketUpdateResult {
    const state = this.getState();
    normalizeMarketMaterialJobs(state);
    const completedSales: MarketCompletedSale[] = [];
    const completedCount = advanceMarketJobs(state, Number(state.upgrades.marketSlots) || 0, now, (job: MarketJob) => {
      state.gold += job.valueNickel;
      completedSales.push({ name: job.name, valueNickel: job.valueNickel });
    });
    return { completedCount, completedSales };
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
      if (materialId === null || materialId === undefined) throw new Error(`Unbekannte Material-ID im Marktauftrag: ${job.name}`);
      const returned = addMaterialQuantityById(state.inventory, materialId, job.quantity || 1);
      if (!returned) throw new Error(`Material ${job.name} konnte nicht ins Inventar zurückgegeben werden.`);
      return;
    }
    if (job.weaponSnapshot) state.weaponInventory.unshift(job.weaponSnapshot as RuntimeMarketWeapon);
  }
}
