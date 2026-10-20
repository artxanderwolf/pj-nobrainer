import { Injectable } from '@angular/core';
import { getMaterialIdByName, type WeaponSlot } from '../game/game-core';
import { materialSellData, weaponSellData } from '../game/economy-core';
import { getWeaponEquipLocation, type EquipmentCharacterLike } from '../game/equipment-core';
import { addMaterialQuantityById, type MaterialStorageInventory } from '../game/material-storage-core';
import {
  advanceMarketJobs,
  cancelMarketJob,
  enqueueMarketJob,
  hasMarketCapacity,
  type MarketJob,
  type MarketStateLike
} from '../game/market-core';
import { GameStateService, type MutableGameState } from './game-state.service';

export type MarketMaterialStartResult =
  | { status: 'no-stock' }
  | { status: 'unknown-material' }
  | { status: 'full' }
  | { status: 'started' | 'queued'; name: string; quantity: number; valueNickel: number };

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

  startMaterial(name: string, quantity = 1, at = Date.now()): MarketMaterialStartResult {
    const state = this.getState();
    const stock = Number(state.inventory[name]?.qty) || 0;
    if (stock <= 0) return { status: 'no-stock' };
    const unit = materialSellData(name);
    if (!unit) return { status: 'unknown-material' };
    const qty = Math.max(1, Math.min(stock, Math.floor(Number(quantity) || 1)));
    const job: MarketJob = { ...unit, quantity: qty, valueNickel: unit.valueNickel * qty, seconds: unit.seconds * qty, unitValueNickel: unit.valueNickel, unitSeconds: unit.seconds };
    const status = enqueueMarketJob(state, job, Number(state.upgrades.marketSlots) || 0, Number(state.upgrades.marketQueue) || 0, at);
    if (status === 'full') return { status: 'full' };
    const remaining = stock - qty;
    if (remaining > 0) state.inventory[name] = { ...(state.inventory[name] ?? {}), qty: remaining };
    else delete state.inventory[name];
    return { status, name, quantity: qty, valueNickel: job.valueNickel };
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
    this.returnJob(state, job);
    return { name: job.name };
  }

  update(now = Date.now()): MarketUpdateResult {
    const state = this.getState();
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
      startMaterial: (name, quantity, at) => this.startMaterial(name, quantity, at),
      startWeapon: (weaponId, at) => this.startWeapon(weaponId, at),
      cancel: (kind, index, at) => this.cancel(kind, index, at)
    };
  }

  closeLegacyCompatibilityBridge(): void { delete window.NoBrainerMarketCompatibility; }

  private getState(): RuntimeMarketState { return this.gameState.getState<RuntimeMarketState>(); }

  private returnJob(state: RuntimeMarketState, job: MarketJob): void {
    if (job.type === 'material') {
      const materialId = getMaterialIdByName(job.name);
      if (materialId === null) throw new Error(`Unbekanntes Material im Marktauftrag: ${job.name}`);
      const returned = addMaterialQuantityById(state.inventory, materialId, job.quantity || 1);
      if (!returned) throw new Error(`Material ${job.name} konnte nicht ins Inventar zurückgegeben werden.`);
      return;
    }
    if (job.weaponSnapshot) state.weaponInventory.unshift(job.weaponSnapshot as RuntimeMarketWeapon);
  }
}
