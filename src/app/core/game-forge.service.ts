import { Injectable } from '@angular/core';
import { calculateWeaponEconomy } from '../game/economy-core';
import {
  createStatModifiers,
  getMaterialReferenceById,
  getWeaponForm,
  isWeaponSelectionComplete,
  normalizeWeaponSlots,
  type WeaponFormDefinition,
  type WeaponSlot,
  type WeaponStats
} from '../game/game-core';
import {
  advanceForgeJobs,
  calculateWeaponBalanceSnapshot,
  createForgeJob,
  enqueueForgeJob,
  forgeRequirements,
  getForgeSelectionQuantities,
  getVisibleWeaponForms,
  getWeaponCraftCount,
  getWeaponUnlockState,
  hasForgeCapacity,
  hasForgeMaterials,
  isWeaponFormUnlocked,
  isWeaponProgressionSource,
  normalizeWeaponCraftCounts,
  recordCompletedWeaponCraft,
  refreshForgeJobBalance,
  reserveForgeMaterials,
  type ForgeInventory,
  type ForgeJob,
  type ForgeMaterialRequirements,
  type ForgeStateLike,
  type WeaponCraftCounts,
  type WeaponUnlockState
} from '../game/forge-core';
import { getMaterialQuantityById } from '../game/material-storage-core';
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
  | { status: 'locked'; weaponForm: string }
  | { status: 'incomplete' }
  | { status: 'missing-material'; material: string; materialId: number; required: number; available: number }
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
  starter?: boolean;
}

type RuntimeForgeState = MutableGameState & ForgeStateLike & {
  inventory: ForgeInventory;
  upgrades: RuntimeForgeUpgrades;
  weaponInventory: RuntimeWeaponInventoryEntry[];
  nextWeaponId: number;
  weaponCraftCounts?: WeaponCraftCounts;
};

interface LegacyForgeCompatibilityBridge {
  requirements(weaponForm: string, slots: readonly WeaponSlot[]): ForgeMaterialRequirements;
  hasMaterials(requirements: ForgeMaterialRequirements): boolean;
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
  private balanceRefreshApplied = false;

  constructor(private readonly gameState: GameStateService) {}

  requirements(weaponForm: string, slots: readonly WeaponSlot[]): ForgeMaterialRequirements {
    return forgeRequirements(slots, weaponForm);
  }

  selectionQuantities(weaponForm: string) {
    return getForgeSelectionQuantities(weaponForm);
  }

  isComplete(weaponForm: string, slots: readonly WeaponSlot[]): boolean {
    return isWeaponSelectionComplete(slots, weaponForm);
  }

  hasMaterials(requirements: ForgeMaterialRequirements): boolean {
    return hasForgeMaterials(this.getState().inventory, requirements);
  }

  visibleWeaponForms(): string[] {
    return getVisibleWeaponForms(this.getCraftCounts());
  }

  unlockState(weaponForm: string): WeaponUnlockState {
    return getWeaponUnlockState(weaponForm, this.getCraftCounts());
  }

  craftCount(weaponForm: string): number {
    return getWeaponCraftCount(this.getCraftCounts(), weaponForm);
  }

  isProgressionSource(weaponForm: string): boolean {
    return isWeaponProgressionSource(weaponForm);
  }

  preview(weaponForm: string, slots: readonly WeaponSlot[]): ForgePreviewResult {
    const form = getWeaponForm(weaponForm);
    const copiedSlots = normalizeWeaponSlots(slots).map(slot => ({ ...slot }));
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
      slots: job.slots,
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

    if (!isWeaponFormUnlocked(weaponForm, this.getCraftCounts(state))) return { status: 'locked', weaponForm };
    if (!hasForgeCapacity(state, activeSlots, queueSlots)) return { status: 'full' };
    if (!this.isComplete(weaponForm, slots)) return { status: 'incomplete' };

    const normalizedSlots = normalizeWeaponSlots(slots);
    const requirements = forgeRequirements(normalizedSlots, weaponForm);
    const missing = Object.entries(requirements).find(
      ([materialId, required]) => getMaterialQuantityById(state.inventory, Number(materialId)) < required
    );
    if (missing) return this.missingMaterialResult(state, missing);

    const job = createForgeJob(weaponForm, weaponName, normalizedSlots);
    if (!reserveForgeMaterials(state.inventory, requirements)) {
      const fallbackMissing = Object.entries(requirements).find(
        ([materialId, required]) => getMaterialQuantityById(state.inventory, Number(materialId)) < required
      );
      if (fallbackMissing) return this.missingMaterialResult(state, fallbackMissing);
      return { status: 'incomplete' };
    }

    const status = enqueueForgeJob(state, job, activeSlots, queueSlots, at);
    if (status === 'full') throw new Error('Schmiedekapazität änderte sich während einer synchronen Auftragserstellung.');
    return { status, weaponName: job.weaponName };
  }

  /** Ergänzt bei alten Waffen und Schmiedeaufträgen die stabilen Material-IDs. */
  normalizeMaterialReferences(): number {
    const state = this.getState();
    let changed = 0;

    for (const weapon of state.weaponInventory) {
      if (!Array.isArray(weapon.slots)) continue;
      const normalized = normalizeWeaponSlots(weapon.slots);
      if (JSON.stringify(normalized) === JSON.stringify(weapon.slots)) continue;
      weapon.slots = normalized;
      changed += 1;
    }

    for (const job of [...state.forgeJobs, ...state.forgeQueue]) {
      if (!Array.isArray(job.slots)) continue;
      const normalized = normalizeWeaponSlots(job.slots);
      if (JSON.stringify(normalized) === JSON.stringify(job.slots)) continue;
      job.slots = normalized;
      changed += 1;
    }

    return changed;
  }

  update(now = Date.now()): ForgeUpdateResult {
    const state = this.getState();
    this.refreshMaterialBalance(state);
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

  private missingMaterialResult(
    state: RuntimeForgeState,
    missing: [string, number]
  ): Extract<ForgeStartResult, { status: 'missing-material' }> {
    const [rawMaterialId, required] = missing;
    const materialId = Number(rawMaterialId);
    const reference = getMaterialReferenceById(materialId);
    return {
      status: 'missing-material',
      material: reference?.displayName ?? `Material #${materialId}`,
      materialId,
      required,
      available: getMaterialQuantityById(state.inventory, materialId)
    };
  }

  private refreshMaterialBalance(state: RuntimeForgeState): void {
    if (this.balanceRefreshApplied) return;
    this.balanceRefreshApplied = true;

    for (const weapon of state.weaponInventory) {
      if (weapon.starter || weapon.id === 0 || !weapon.weaponForm || !Array.isArray(weapon.slots)) continue;
      const snapshot = calculateWeaponBalanceSnapshot(weapon.weaponForm, weapon.slots);
      weapon.slots = snapshot.slots;
      weapon.stats = snapshot.stats;
      weapon.valueNickel = snapshot.valueNickel;
    }

    for (const job of state.forgeJobs) refreshForgeJobBalance(job, true);
    for (const job of state.forgeQueue) refreshForgeJobBalance(job, false);
  }

  private getState(): RuntimeForgeState {
    return this.gameState.getState<RuntimeForgeState>();
  }

  private getCraftCounts(state = this.getState()): WeaponCraftCounts {
    const normalized = normalizeWeaponCraftCounts(state.weaponCraftCounts);
    state.weaponCraftCounts = normalized;
    return normalized;
  }

  private completeJob(state: RuntimeForgeState, job: ForgeJob): string {
    const form = getWeaponForm(job.weaponForm);
    const name = job.weaponName || form.name;
    const economy = calculateWeaponEconomy(job.stats);
    state.weaponInventory.unshift({
      id: state.nextWeaponId++,
      name,
      weaponForm: job.weaponForm,
      slots: normalizeWeaponSlots(job.slots),
      stats: job.stats,
      valueNickel: economy.valueNickel,
      craftedSeconds: job.totalSeconds
    });
    recordCompletedWeaponCraft(this.getCraftCounts(state), job.weaponForm);
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
