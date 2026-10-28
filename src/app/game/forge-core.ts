import {
  calculateWeaponEconomy
} from './economy-core.ts';
import {
  CONFIG,
  calculateWeaponStats,
  canonicalWeaponSlots,
  getWeaponCraftingSlots,
  getWeaponForm,
  getWeaponSelectionQuantity,
  isWeaponSelectionComplete,
  normalizeWeaponSlots,
  type WeaponCraftingSlotId,
  type WeaponSlot,
  type WeaponStats
} from './game-core.ts';
import {
  getMaterialQuantityById,
  reserveMaterialQuantitiesById,
  type MaterialQuantityRequirements,
  type MaterialStorageInventory
} from './material-storage-core.ts';

export type ForgeInventory = MaterialStorageInventory;
export type ForgeMaterialRequirements = MaterialQuantityRequirements;
export interface ForgeJob {
  weaponForm: string;
  weaponName: string;
  slots: WeaponSlot[];
  stats: WeaponStats;
  valueNickel: number;
  performance: number;
  totalSeconds: number;
  startedAt?: number;
  finishesAt?: number;
}
export interface WeaponBalanceSnapshot {
  slots: WeaponSlot[];
  stats: WeaponStats;
  valueNickel: number;
  performance: number;
  forgeSeconds: number;
}
export interface ForgeStateLike {
  forgeJobs: ForgeJob[];
  forgeQueue: ForgeJob[];
}

export const WEAPON_CRAFT_UNLOCK_TARGET = 10;
export type WeaponCraftCounts = Record<string, number>;

export interface WeaponUnlockProgress {
  weaponForm: string;
  current: number;
  target: number;
}

export interface WeaponUnlockState {
  weaponForm: string;
  visible: boolean;
  unlocked: boolean;
  prerequisites: readonly WeaponUnlockProgress[];
}

const PROGRESSION_SOURCE_FORMS = new Set(['dagger', 'sword', 'axe1h', 'sword2h', 'axe2h']);

export function normalizeWeaponCraftCounts(raw: unknown): WeaponCraftCounts {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const normalized: WeaponCraftCounts = {};
  for (const [weaponForm, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Object.prototype.hasOwnProperty.call(CONFIG.forge.weaponForms, weaponForm)) continue;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) continue;
    normalized[weaponForm] = Math.floor(numeric);
  }
  return normalized;
}

export function getWeaponCraftCount(counts: Readonly<WeaponCraftCounts> | null | undefined, weaponForm: string): number {
  const numeric = Number(counts?.[weaponForm]);
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 0;
}

export function recordCompletedWeaponCraft(counts: WeaponCraftCounts, weaponForm: string): number {
  if (!Object.prototype.hasOwnProperty.call(CONFIG.forge.weaponForms, weaponForm)) return 0;
  const next = getWeaponCraftCount(counts, weaponForm) + 1;
  counts[weaponForm] = next;
  return next;
}

function progress(counts: Readonly<WeaponCraftCounts> | null | undefined, weaponForm: string): WeaponUnlockProgress {
  return {
    weaponForm,
    current: getWeaponCraftCount(counts, weaponForm),
    target: WEAPON_CRAFT_UNLOCK_TARGET
  };
}

function reached(counts: Readonly<WeaponCraftCounts> | null | undefined, weaponForm: string): boolean {
  return getWeaponCraftCount(counts, weaponForm) >= WEAPON_CRAFT_UNLOCK_TARGET;
}

export function getWeaponUnlockState(
  weaponForm: string,
  counts: Readonly<WeaponCraftCounts> | null | undefined
): WeaponUnlockState {
  switch (weaponForm) {
    case 'dagger':
      return { weaponForm, visible: true, unlocked: true, prerequisites: [] };
    case 'sword':
    case 'axe1h': {
      const unlocked = reached(counts, 'dagger');
      return { weaponForm, visible: unlocked, unlocked, prerequisites: [progress(counts, 'dagger')] };
    }
    case 'sword2h': {
      const visible = reached(counts, 'dagger');
      const unlocked = reached(counts, 'sword');
      return { weaponForm, visible, unlocked, prerequisites: [progress(counts, 'sword')] };
    }
    case 'axe2h': {
      const visible = reached(counts, 'dagger');
      const unlocked = reached(counts, 'axe1h');
      return { weaponForm, visible, unlocked, prerequisites: [progress(counts, 'axe1h')] };
    }
    case 'bow':
    case 'staff': {
      const visible = reached(counts, 'sword') && reached(counts, 'axe1h');
      const unlocked = reached(counts, 'sword2h') && reached(counts, 'axe2h');
      return {
        weaponForm,
        visible,
        unlocked,
        prerequisites: [progress(counts, 'sword2h'), progress(counts, 'axe2h')]
      };
    }
    default:
      return { weaponForm, visible: false, unlocked: false, prerequisites: [] };
  }
}

export function isWeaponFormUnlocked(
  weaponForm: string,
  counts: Readonly<WeaponCraftCounts> | null | undefined
): boolean {
  return getWeaponUnlockState(weaponForm, counts).unlocked;
}

export function getVisibleWeaponForms(counts: Readonly<WeaponCraftCounts> | null | undefined): string[] {
  return Object.keys(CONFIG.forge.weaponForms).filter(weaponForm => getWeaponUnlockState(weaponForm, counts).visible);
}

export function isWeaponProgressionSource(weaponForm: string): boolean {
  return PROGRESSION_SOURCE_FORMS.has(weaponForm);
}

export function forgeRequirements(slots: readonly WeaponSlot[], weaponForm = 'sword'): Record<number, number> {
  const normalized = normalizeWeaponSlots(slots);
  const selected = new Map(normalized.map(slot => [slot.slot, slot.materialId]));
  const requirements: Record<number, number> = {};

  for (const slot of getWeaponCraftingSlots(weaponForm)) {
    const materialId = Number(selected.get(slot));
    const quantity = getWeaponSelectionQuantity(weaponForm, slot);
    if (Number.isInteger(materialId) && materialId > 0 && quantity > 0) {
      requirements[materialId] = (requirements[materialId] ?? 0) + quantity;
    }
  }
  return requirements;
}

export function getForgeSelectionQuantities(weaponForm: string): Record<WeaponCraftingSlotId, number> {
  return Object.fromEntries(
    getWeaponCraftingSlots(weaponForm).map(slot => [slot, getWeaponSelectionQuantity(weaponForm, slot)])
  ) as Record<WeaponCraftingSlotId, number>;
}

export function hasForgeMaterials(inventory: ForgeInventory, requirements: ForgeMaterialRequirements): boolean {
  return Object.entries(requirements).every(
    ([materialId, qty]) => getMaterialQuantityById(inventory, Number(materialId)) >= Number(qty)
  );
}

export function reserveForgeMaterials(inventory: ForgeInventory, requirements: ForgeMaterialRequirements): boolean {
  return reserveMaterialQuantitiesById(inventory, requirements);
}

export function calculateWeaponBalanceSnapshot(
  weaponForm: string,
  slots: readonly WeaponSlot[]
): WeaponBalanceSnapshot {
  const craftingSlots = new Set(getWeaponCraftingSlots(weaponForm));
  const storedSlots = canonicalWeaponSlots(slots)
    .filter(slot => craftingSlots.has(slot.slot as WeaponCraftingSlotId));
  const stats = calculateWeaponStats(storedSlots, weaponForm);
  const economy = calculateWeaponEconomy(stats);
  return {
    slots: storedSlots,
    stats,
    valueNickel: economy.valueNickel,
    performance: economy.performance,
    forgeSeconds: economy.forgeSeconds
  };
}

export function refreshForgeJobBalance(job: ForgeJob, preserveDuration: boolean): boolean {
  const snapshot = calculateWeaponBalanceSnapshot(job.weaponForm, job.slots);
  const changed = JSON.stringify(job.slots) !== JSON.stringify(snapshot.slots)
    || JSON.stringify(job.stats) !== JSON.stringify(snapshot.stats)
    || job.valueNickel !== snapshot.valueNickel
    || job.performance !== snapshot.performance
    || (!preserveDuration && job.totalSeconds !== snapshot.forgeSeconds);

  job.slots = snapshot.slots;
  job.stats = snapshot.stats;
  job.valueNickel = snapshot.valueNickel;
  job.performance = snapshot.performance;
  if (!preserveDuration) job.totalSeconds = snapshot.forgeSeconds;
  return changed;
}

export function createForgeJob(weaponForm: string, weaponName: string, slots: readonly WeaponSlot[]): ForgeJob {
  const form = getWeaponForm(weaponForm);
  const snapshot = calculateWeaponBalanceSnapshot(weaponForm, slots);
  return {
    weaponForm,
    weaponName: weaponName.trim() || form.name,
    slots: snapshot.slots,
    stats: snapshot.stats,
    valueNickel: snapshot.valueNickel,
    performance: snapshot.performance,
    totalSeconds: snapshot.forgeSeconds
  };
}

export function hasForgeCapacity(state: ForgeStateLike, activeSlots: number, queueSlots: number): boolean {
  return state.forgeJobs.length + state.forgeQueue.length < Math.max(0, activeSlots) + Math.max(0, queueSlots);
}

export function startForgeQueuedJob(job: ForgeJob, at: number): ForgeJob {
  job.startedAt = at;
  job.finishesAt = at + job.totalSeconds * 1000;
  return job;
}

export function fillForgeSlots(state: ForgeStateLike, activeSlots: number, at: number): ForgeJob[] {
  const started: ForgeJob[] = [];
  while (state.forgeJobs.length < Math.max(0, activeSlots) && state.forgeQueue.length) {
    const job = state.forgeQueue.shift();
    if (!job) break;
    startForgeQueuedJob(job, at);
    state.forgeJobs.push(job);
    started.push(job);
  }
  return started;
}

export function enqueueForgeJob(state: ForgeStateLike, job: ForgeJob, activeSlots: number, queueSlots: number, at: number): 'started' | 'queued' | 'full' {
  if (!hasForgeCapacity(state, activeSlots, queueSlots)) return 'full';
  if (state.forgeJobs.length < Math.max(0, activeSlots)) {
    startForgeQueuedJob(job, at);
    state.forgeJobs.push(job);
    return 'started';
  }
  state.forgeQueue.push(job);
  return 'queued';
}

export function advanceForgeJobs(state: ForgeStateLike, activeSlots: number, now: number, onComplete: (job: ForgeJob, at: number) => void): number {
  let completed = 0;
  let guard = 0;
  while (guard++ < 10000) {
    const next = state.forgeJobs
      .filter(job => Number.isFinite(job.finishesAt) && Number(job.finishesAt) <= now)
      .sort((a, b) => Number(a.finishesAt) - Number(b.finishesAt))[0];
    if (!next) break;
    const at = Number(next.finishesAt);
    const done = state.forgeJobs.filter(job => Number(job.finishesAt) <= at);
    for (const job of done) onComplete(job, at);
    completed += done.length;
    state.forgeJobs = state.forgeJobs.filter(job => Number(job.finishesAt) > at);
    fillForgeSlots(state, activeSlots, at);
  }
  fillForgeSlots(state, activeSlots, now);
  return completed;
}

export const FORGE_CORE_BRIDGE = {
  forgeRequirements,
  getForgeSelectionQuantities,
  isWeaponSelectionComplete,
  hasForgeMaterials,
  reserveForgeMaterials,
  calculateWeaponBalanceSnapshot,
  refreshForgeJobBalance,
  createForgeJob,
  hasForgeCapacity,
  startForgeQueuedJob,
  fillForgeSlots,
  enqueueForgeJob,
  advanceForgeJobs,
  normalizeWeaponCraftCounts,
  getWeaponCraftCount,
  recordCompletedWeaponCraft,
  getWeaponUnlockState,
  isWeaponFormUnlocked,
  getVisibleWeaponForms,
  isWeaponProgressionSource
};
export type ForgeCoreBridge = typeof FORGE_CORE_BRIDGE;
