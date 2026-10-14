import { Injectable } from '@angular/core';
import { CONFIG, type WeaponFormDefinition, type WeaponSlot, type WeaponStats } from '../game/game-core';
import {
  advanceForgeJobs,
  createForgeJob,
  enqueueForgeJob,
  forgeRequirements,
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
  requirements(slots: readonly WeaponSlot[]): Record<string, number>;
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

  requirements(slots: readonly WeaponSlot[]): Record<string, number> {
    return forgeRequirements(slots);
  }

  hasMaterials(requirements: Readonly<Record<string, number>>): boolean {
    return hasForgeMaterials(this.getState().inventory, requirements);
  }

  preview(weaponForm: string, slots: readonly WeaponSlot[]): ForgePreviewResult {
    const form = CONFIG.forge.weaponForms[weaponForm] ?? CONFIG.forge.weaponForms['sword'];
    const copiedSlots = slots.map(slot => ({ ...slot }));
    const complete = copiedSlots.every(slot => slot.material);

    if (!complete) {
      return {
        weaponForm,
        slots: copiedSlots,
        form,
        factor: 1,
        valueNickel: 100,
        seconds: Math.round(CONFIG.forge.baseSeconds * form.timeFactor),
        stats: this.emptyStats(form)
      };
    }

    const job = createForgeJob(weaponForm, '', copiedSlots);
    return {
      weaponForm,
      slots: copiedSlots,
      form,
      factor: job.valueNickel / 100,
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
    if (!slots.every(slot => slot.material)) return { status: 'incomplete' };

    const requirements = forgeRequirements(slots);
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
    if (status === 'full') {
      throw new Error('Schmiedekapazität änderte sich während einer synchronen Auftragserstellung.');
    }
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
    if (window.NoBrainerForgeCompatibility) {
      throw new Error('NoBrainer-Schmiede-Kompatibilitätsbrücke ist bereits geöffnet.');
    }

    window.NoBrainerForgeCompatibility = {
      requirements: slots => this.requirements(slots),
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
    const form = CONFIG.forge.weaponForms[job.weaponForm] ?? CONFIG.forge.weaponForms['sword'];
    const name = job.weaponName || form.name;
    state.weaponInventory.unshift({
      id: state.nextWeaponId++,
      name,
      weaponForm: job.weaponForm,
      slots: job.slots,
      stats: job.stats,
      valueNickel: job.valueNickel,
      craftedSeconds: job.totalSeconds
    });
    return name;
  }

  private emptyStats(form: WeaponFormDefinition): WeaponStats {
    return {
      materialBaseDamage: 0,
      materialBaseSpeed: 0,
      formDamageFactor: form.damageFactor ?? 1,
      formSpeedFactor: form.speedFactor ?? 1,
      baseDamage: 0,
      baseSpeed: 0,
      bladeMultiplier: 1,
      gripMultiplier: 1,
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
