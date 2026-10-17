export const MAX_ARMOR_PERCENT = 80;

export interface ArmorResolution {
  armor: number;
  penetration: number;
  effectiveArmor: number;
  reduction: number;
}

export function clampArmorPercent(armor: number | null | undefined): number {
  return Math.max(0, Math.min(MAX_ARMOR_PERCENT, Number(armor) || 0));
}

export function resolveArmor(
  armor: number | null | undefined,
  penetration: number | null | undefined
): ArmorResolution {
  const cappedArmor = clampArmorPercent(armor);
  const clampedPenetration = Math.max(0, Math.min(1, Number(penetration) || 0));
  const effectiveArmor = cappedArmor * (1 - clampedPenetration);
  return {
    armor: cappedArmor,
    penetration: clampedPenetration,
    effectiveArmor,
    reduction: effectiveArmor / 100
  };
}

export const ARMOR_CORE_BRIDGE = {
  MAX_ARMOR_PERCENT,
  clampArmorPercent,
  resolveArmor
};

export type ArmorCoreBridge = typeof ARMOR_CORE_BRIDGE;
