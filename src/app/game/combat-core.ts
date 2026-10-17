import { resolveArmor } from './armor-core';

export interface CombatTargetLike {
  hp: number;
  alive: boolean;
  armor?: number | null;
  threat?: number | null;
  dodge?: number | null;
}

export interface CombatActionPointLike {
  nextAt: number;
}

export interface WeightedTargetEntry<TTarget extends CombatTargetLike> {
  target: TTarget;
  weight: number;
}

export interface AttackResolutionOptions {
  armor?: number | null;
  dodge?: number | null;
  critChance?: number | null;
  critDamage?: number | null;
  critRoll?: number | null;
}

export type AttackResolution =
  | { outcome: 'miss' }
  | { outcome: 'dodge' }
  | { outcome: 'hit'; dealt: number; critical: boolean };

export function targetWeight(threat: number | null | undefined, fallbackThreat = 50): number {
  const resolved = Number.isFinite(Number(threat)) ? Number(threat) : fallbackThreat;
  return Math.max(0.01, resolved);
}

export function buildWeightedTargets<TTarget extends CombatTargetLike>(
  targets: readonly TTarget[],
  getFallbackThreat: (target: TTarget) => number = () => 50
): WeightedTargetEntry<TTarget>[] {
  return targets
    .filter(target => target.alive && target.hp > 0)
    .map(target => ({
      target,
      weight: targetWeight(target.threat, getFallbackThreat(target))
    }));
}

export function applyAttackDamage<TTarget extends CombatTargetLike>(
  target: TTarget,
  damage: number,
  penetration: number,
  armorOverride?: number | null
): number {
  const armor = armorOverride === null || armorOverride === undefined ? target.armor : armorOverride;
  const armorResolution = resolveArmor(armor, penetration);
  const dealt = Math.max(0, (Number(damage) || 0) * (1 - armorResolution.reduction));
  target.hp = Math.max(0, target.hp - dealt);
  target.alive = target.hp > 0;
  return dealt;
}

export function resolveAttack<TTarget extends CombatTargetLike>(
  target: TTarget,
  damage: number,
  hitChance: number,
  penetration: number,
  hitRoll: number,
  dodgeRoll: number,
  options: AttackResolutionOptions = {}
): AttackResolution {
  const clampedHitChance = Math.max(0, Math.min(1, Number(hitChance) || 0));
  if (hitRoll >= clampedHitChance) return { outcome: 'miss' };

  const dodge = options.dodge === null || options.dodge === undefined ? target.dodge : options.dodge;
  const clampedDodge = Math.max(0, Math.min(1, Number(dodge) || 0));
  if (dodgeRoll < clampedDodge) return { outcome: 'dodge' };

  const critChance = Math.max(0, Math.min(1, Number(options.critChance) || 0));
  const critDamage = Math.max(1, Number(options.critDamage) || 1);
  const critRoll = Number.isFinite(Number(options.critRoll)) ? Number(options.critRoll) : 1;
  const critical = critRoll < critChance;
  const resolvedDamage = (Number(damage) || 0) * (critical ? critDamage : 1);
  return {
    outcome: 'hit',
    dealt: applyAttackDamage(target, resolvedDamage, penetration, options.armor),
    critical
  };
}

export function enforceGlobalActionCooldown<TPoint extends CombatActionPointLike>(
  points: readonly TPoint[],
  actionAt: number,
  minimumIntervalMs = 1000
): void {
  if (!points.length) return;

  const earliestNextAction = actionAt + Math.max(0, minimumIntervalMs);
  const scheduledTimes = points
    .map(point => Number(point.nextAt))
    .filter(Number.isFinite);
  if (!scheduledTimes.length) return;

  const currentEarliest = Math.min(...scheduledTimes);
  const shift = Math.max(0, earliestNextAction - currentEarliest);
  if (shift <= 0) return;

  points.forEach(point => {
    const nextAt = Number(point.nextAt);
    if (Number.isFinite(nextAt)) point.nextAt = nextAt + shift;
  });
}

export const COMBAT_CORE_BRIDGE = {
  buildWeightedTargets,
  applyAttackDamage,
  resolveAttack,
  enforceGlobalActionCooldown
};

export type CombatCoreBridge = typeof COMBAT_CORE_BRIDGE;
