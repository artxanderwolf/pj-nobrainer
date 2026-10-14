import { CONFIG, calculateWeaponStats, rarityFactor, type WeaponSlot, type WeaponStats } from './game-core';

export interface ForgeInventoryEntry { qty?: number | null; }
export type ForgeInventory = Record<string, ForgeInventoryEntry | undefined>;
export interface ForgeJob {
  weaponForm: string;
  weaponName: string;
  slots: WeaponSlot[];
  stats: WeaponStats;
  valueNickel: number;
  totalSeconds: number;
  startedAt?: number;
  finishesAt?: number;
}
export interface ForgeStateLike {
  forgeJobs: ForgeJob[];
  forgeQueue: ForgeJob[];
}

export function forgeRequirements(slots: readonly WeaponSlot[]): Record<string, number> {
  const requirements: Record<string, number> = {};
  for (const slot of slots) {
    if (slot.material) requirements[slot.material] = (requirements[slot.material] ?? 0) + 1;
  }
  return requirements;
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
  const form = CONFIG.forge.weaponForms[weaponForm] ?? CONFIG.forge.weaponForms['sword'];
  const factor = rarityFactor(slots);
  return {
    weaponForm,
    weaponName: weaponName.trim() || form.name,
    slots: slots.map((slot) => ({ ...slot })),
    stats: calculateWeaponStats(slots, weaponForm),
    valueNickel: Math.round(100 * factor),
    totalSeconds: Math.round(CONFIG.forge.baseSeconds * form.timeFactor * factor)
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
      .filter((job) => Number.isFinite(job.finishesAt) && Number(job.finishesAt) <= now)
      .sort((a, b) => Number(a.finishesAt) - Number(b.finishesAt))[0];
    if (!next) break;
    const at = Number(next.finishesAt);
    const done = state.forgeJobs.filter((job) => Number(job.finishesAt) <= at);
    for (const job of done) onComplete(job, at);
    completed += done.length;
    state.forgeJobs = state.forgeJobs.filter((job) => Number(job.finishesAt) > at);
    fillForgeSlots(state, activeSlots, at);
  }
  fillForgeSlots(state, activeSlots, now);
  return completed;
}

export const FORGE_CORE_BRIDGE = {
  forgeRequirements,
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
