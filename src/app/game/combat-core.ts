export interface CombatTargetLike {
  hp: number;
  alive: boolean;
  armor?: number | null;
  distance?: number | null;
}

export interface WeightedTargetEntry<TTarget extends CombatTargetLike> {
  target: TTarget;
  weight: number;
}

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

export const COMBAT_CORE_BRIDGE = {
  buildWeightedTargets,
  applyAttackDamage
};

export type CombatCoreBridge = typeof COMBAT_CORE_BRIDGE;
