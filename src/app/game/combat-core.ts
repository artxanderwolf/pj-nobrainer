export interface CombatTargetLike {
  hp: number;
  alive: boolean;
  armor?: number | null;
  distance?: number | null;
  dodge?: number | null;
}

export interface CombatActionPointLike {
  nextAt: number;
}

export interface WeightedTargetEntry<TTarget extends CombatTargetLike> {
  target: TTarget;
  weight: number;
}

export type AttackResolution =
  | { outcome: 'miss' }
  | { outcome: 'dodge' }
  | { outcome: 'hit'; dealt: number };

export function targetWeight(distance: number | null | undefined, fallbackDistance = 2): number {
  const resolved = Number.isFinite(Number(distance)) ? Number(distance) : fallbackDistance;
  return 1 / Math.max(0.01, resolved);
}

export function buildWeightedTargets<TTarget extends CombatTargetLike>(
  targets: readonly TTarget[],
  getFallbackDistance: (target: TTarget) => number = () => 2
): WeightedTargetEntry<TTarget>[] {
  return targets
    .filter(target => target.alive && target.hp > 0)
    .map(target => ({
      target,
      weight: targetWeight(target.distance, getFallbackDistance(target))
    }));
}

export function applyAttackDamage<TTarget extends CombatTargetLike>(
  target: TTarget,
  damage: number,
  penetration: number
): number {
  const clampedPenetration = Math.max(0, Math.min(1, Number(penetration) || 0));
  const effectiveArmor = Math.max(0, (Number(target.armor) || 0) * (1 - clampedPenetration));
  const dealt = Math.max(0, (Number(damage) || 0) - effectiveArmor);
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
  dodgeRoll: number
): AttackResolution {
  const clampedHitChance = Math.max(0, Math.min(1, Number(hitChance) || 0));
  if (hitRoll >= clampedHitChance) return { outcome: 'miss' };

  const clampedDodge = Math.max(0, Math.min(1, Number(target.dodge) || 0));
  if (dodgeRoll < clampedDodge) return { outcome: 'dodge' };

  return { outcome: 'hit', dealt: applyAttackDamage(target, damage, penetration) };
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
