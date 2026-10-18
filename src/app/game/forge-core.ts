import {
  calculateWeaponEconomy
} from './economy-core';
import {
  calculateWeaponStats,
  getWeaponCraftingSlots,
  getWeaponForm,
  getWeaponSelectionQuantity,
  isWeaponSelectionComplete,
  normalizeWeaponSlots,
  type WeaponCraftingSlotId,
  type WeaponSlot,
  type WeaponStats
} from './game-core';

export interface ForgeInventoryEntry { qty?: number | null; }
export type ForgeInventory = Record<string, ForgeInventoryEntry | undefined>;
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
export interface ForgeStateLike {
  forgeJobs: ForgeJob[];
  forgeQueue: ForgeJob[];
}

export function forgeRequirements(slots: readonly WeaponSlot[], weaponForm = 'sword'): Record<string, number> {
  const normalized = normalizeWeaponSlots(slots);
  const selected = new Map(normalized.map(slot => [slot.slot, slot.material]));
  const requirements: Record<string, number> = {};

  for (const slot of getWeaponCraftingSlots(weaponForm)) {
    const material = selected.get(slot);
    const quantity = getWeaponSelectionQuantity(weaponForm, slot);
    if (material && quantity > 0) requirements[material] = (requirements[material] ?? 0) + quantity;
  }
  return requirements;
}

export function getForgeSelectionQuantities(weaponForm: string): Record<WeaponCraftingSlotId, number> {
  return Object.fromEntries(
    getWeaponCraftingSlots(weaponForm).map(slot => [slot, getWeaponSelectionQuantity(weaponForm, slot)])
  ) as Record<WeaponCraftingSlotId, number>;
}

export function hasForgeMaterials(inventory: ForgeInventory, requirements: Readonly<Record<string, number>>): boolean {
  return Object.entries(requirements).every(([name, qty]) => (Number(inventory[name]?.qty) || 0) >= qty);
}

export function reserveForgeMaterials(inventory: ForgeInventory, requirements: Readonly<Record<string, number>>): boolean {
  if (!hasForgeMaterials(inventory, requirements)) return false;
  for (const [name, qty] of Object.entries(requirements)) {
    const remaining = (Number(inventory[name]?.qty) || 0) - qty;
    if (remaining > 0) inventory[name] = { ...(inventory[name] ?? {}), qty: remaining };
    else delete inventory[name];
  }
  return true;
}

export function createForgeJob(weaponForm: string, weaponName: string, slots: readonly WeaponSlot[]): ForgeJob {
  const form = getWeaponForm(weaponForm);
  const normalized = normalizeWeaponSlots(slots);
  const craftingSlots = new Set(getWeaponCraftingSlots(weaponForm));
  const storedSlots = normalized
    .filter(slot => craftingSlots.has(slot.slot as WeaponCraftingSlotId))
    .map(slot => ({ ...slot }));
  const stats = calculateWeaponStats(storedSlots, weaponForm);
  const economy = calculateWeaponEconomy(stats);
  return {
    weaponForm,
    weaponName: weaponName.trim() || form.name,
    slots: storedSlots,
    stats,
    valueNickel: economy.valueNickel,
    performance: economy.performance,
    totalSeconds: economy.forgeSeconds
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
  createForgeJob,
  hasForgeCapacity,
  startForgeQueuedJob,
  fillForgeSlots,
  enqueueForgeJob,
  advanceForgeJobs
};
export type ForgeCoreBridge = typeof FORGE_CORE_BRIDGE;
