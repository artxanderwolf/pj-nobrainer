import { Injectable } from '@angular/core';
import { calculateWeaponEconomy } from '../game/economy-core';
import {
  createStatModifiers,
  getWeaponForm,
  isWeaponSelectionComplete,
  type WeaponFormDefinition,
  type WeaponSlot,
  type WeaponStats
} from '../game/game-core';
import {
  advanceForgeJobs,
  createForgeJob,
  enqueueForgeJob,
  forgeRequirements,
  getForgeSelectionQuantities,
  hasForgeCapacity,
  hasForgeMaterials,
  reserveForgeMaterials,
  type ForgeInventory,
  type ForgeJob,
  type ForgeStateLike
} from '../game/forge-core';
import { GameStateService, type MutableGameState } from './game-state.service';

export interface ForgePreviewResult {
  weaponForm: string;
  slots: WeaponSlot[];
  form: WeaponFormDefinition;
  /** Kompatibilitätsfeld für die bestehende Vorschau; enthält jetzt den Waffen-Leistungswert. */
  factor: number;
  valueNickel: number;
  seconds: number;
  stats: WeaponStats;
}

export type ForgeStartResult =
  | { status: 'full' }
  | { status: 'incomplete' }
  | { status: 'missing-material'; material: string; required: number; available: number }
  | { status: 'started' | 'queued'; weaponName: string };

export interface ForgeUpdateResult {
  completedCount: number;
  completedNames: string[];
}

interface RuntimeForgeUpgrades {
  forgeSlots: number;
  forgeQueue: number;
}

interface RuntimeWeaponInventoryEntry {
  id: number;
  name: string;
  weaponForm: string;
  slots: WeaponSlot[];
  stats: WeaponStats;
  valueNickel: number;
  craftedSeconds: number;
}

type RuntimeForgeState = MutableGameState & ForgeStateLike & {
  inventory: ForgeInventory;
  upgrades: RuntimeForgeUpgrades;
  weaponInventory: RuntimeWeaponInventoryEntry[];
  nextWeaponId: number;
};

interface LegacyForgeCompatibilityBridge {
  requirements(weaponForm: string, slots: readonly WeaponSlot[]): Record<string, number>;
  hasMaterials(requirements: Readonly<Record<string, number>>): boolean;
  preview(weaponForm: string, slots: readonly WeaponSlot[]): ForgePreviewResult;
  start(weaponForm: string, weaponName: string, slots: readonly WeaponSlot[], at?: number): ForgeStartResult;
}

declare global {
  interface Window {
    NoBrainerForgeCompatibility?: LegacyForgeCompatibilityBridge;
  }
}

@Injectable({ providedIn: 'root' })
export class GameForgeService {
  constructor(private readonly gameState: GameStateService) {}

  requirements(weaponForm: string, slots: readonly WeaponSlot[]): Record<string, number> {
    return forgeRequirements(slots, weaponForm);
  }

  selectionQuantities(weaponForm: string) {
    return getForgeSelectionQuantities(weaponForm);
  }

  isComplete(weaponForm: string, slots: readonly WeaponSlot[]): boolean {
    return isWeaponSelectionComplete(slots, weaponForm);
  }

  hasMaterials(requirements: Readonly<Record<string, number>>): boolean {
    return hasForgeMaterials(this.getState().inventory, requirements);
  }

  preview(weaponForm: string, slots: readonly WeaponSlot[]): ForgePreviewResult {
    const form = getWeaponForm(weaponForm);
    const copiedSlots = slots.map(slot => ({ ...slot }));
    const complete = this.isComplete(weaponForm, copiedSlots);

    if (!complete) {
      return {
        weaponForm,
        slots: copiedSlots,
        form,
        factor: 0,
        valueNickel: 0,
        seconds: 0,
        stats: this.emptyStats(form)
      };
    }

    const job = createForgeJob(weaponForm, '', copiedSlots);
    return {
      weaponForm,
      slots: copiedSlots,
      form,
      factor: job.performance,
      valueNickel: job.valueNickel,
      seconds: job.totalSeconds,
      stats: job.stats
    };
  }

  start(weaponForm: string, weaponName: string, slots: readonly WeaponSlot[], at = Date.now()): ForgeStartResult {
    const state = this.getState();
    const activeSlots = Number(state.upgrades.forgeSlots) || 0;
    const queueSlots = Number(state.upgrades.forgeQueue) || 0;

    if (!hasForgeCapacity(state, activeSlots, queueSlots)) return { status: 'full' };
    if (!this.isComplete(weaponForm, slots)) return { status: 'incomplete' };

    const requirements = forgeRequirements(slots, weaponForm);
    const missing = Object.entries(requirements).find(
      ([material, required]) => (Number(state.inventory[material]?.qty) || 0) < required
    );
    if (missing) {
      const [material, required] = missing;
      return {
        status: 'missing-material',
        material,
        required,
        available: Number(state.inventory[material]?.qty) || 0
      };
    }

    const job = createForgeJob(weaponForm, weaponName, slots);
    if (!reserveForgeMaterials(state.inventory, requirements)) {
      const fallbackMissing = Object.entries(requirements).find(
        ([material, required]) => (Number(state.inventory[material]?.qty) || 0) < required
      );
      if (fallbackMissing) {
        const [material, required] = fallbackMissing;
        return {
          status: 'missing-material',
          material,
          required,
          available: Number(state.inventory[material]?.qty) || 0
        };
      }
      return { status: 'incomplete' };
    }

    const status = enqueueForgeJob(state, job, activeSlots, queueSlots, at);
    if (status === 'full') throw new Error('Schmiedekapazität änderte sich während einer synchronen Auftragserstellung.');
    return { status, weaponName: job.weaponName };
  }

  update(now = Date.now()): ForgeUpdateResult {
    const state = this.getState();
    const activeSlots = Number(state.upgrades.forgeSlots) || 0;
    const completedNames: string[] = [];

    const completedCount = advanceForgeJobs(state, activeSlots, now, (job: ForgeJob) => {
      completedNames.push(this.completeJob(state, job));
    });

    return { completedCount, completedNames };
  }

  openLegacyCompatibilityBridge(): void {
    if (window.NoBrainerForgeCompatibility) throw new Error('NoBrainer-Schmiede-Kompatibilitätsbrücke ist bereits geöffnet.');
    window.NoBrainerForgeCompatibility = {
      requirements: (weaponForm, slots) => this.requirements(weaponForm, slots),
      hasMaterials: requirements => this.hasMaterials(requirements),
      preview: (weaponForm, slots) => this.preview(weaponForm, slots),
      start: (weaponForm, weaponName, slots, at) => this.start(weaponForm, weaponName, slots, at)
    };
  }

  closeLegacyCompatibilityBridge(): void {
    delete window.NoBrainerForgeCompatibility;
  }

  private getState(): RuntimeForgeState {
    return this.gameState.getState<RuntimeForgeState>();
  }

  private completeJob(state: RuntimeForgeState, job: ForgeJob): string {
    const form = getWeaponForm(job.weaponForm);
    const name = job.weaponName || form.name;
    const economy = calculateWeaponEconomy(job.stats);
    state.weaponInventory.unshift({
      id: state.nextWeaponId++,
      name,
      weaponForm: job.weaponForm,
      slots: job.slots,
      stats: job.stats,
      valueNickel: economy.valueNickel,
      craftedSeconds: job.totalSeconds
    });
    return name;
  }

  private emptyStats(form: WeaponFormDefinition): WeaponStats {
    return {
      weaponBaseDamage: form.baseDamage,
      weaponBaseSpeed: form.baseSpeed,
      weaponBaseHitChance: form.baseHitChance,
      weaponBasePenetration: form.basePenetration,
      characterModifiers: createStatModifiers(),
      specialSpeedFactor: 1,
      materialBaseDamage: form.baseDamage,
      materialBaseSpeed: form.baseSpeed,
      formDamageFactor: 1,
      formSpeedFactor: 1,
      baseDamage: form.baseDamage,
      baseSpeed: form.baseSpeed,
      bladeMultiplier: 1,
      gripMultiplier: 1,
      specialMaterial: null,
      reinforcementMaterial: null,
      reinforcementSpeedFactor: 1,
      reinforcementHitChanceAdd: 0,
      reinforcementPenetrationAdd: 0,
      hitChance: 0,
      penetration: 0,
      damagePerHit: 0,
      attackSpeed: 0,
      expectedRaw: 0
    };
  }
}
