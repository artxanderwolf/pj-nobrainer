import { GENERATED_MATERIAL_QUALITY } from './data/generated/material-quality.generated.ts';

export type MaterialQuality = 1 | 2 | 3 | 4 | 5 | 6;
export const MATERIAL_QUALITIES: readonly MaterialQuality[] = [1, 2, 3, 4, 5, 6];

export function isMaterialQuality(value: unknown): value is MaterialQuality {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 6;
}

/** A missing quality is accepted only for the real pre-quality save/API boundary. */
export function resolveMaterialQuality(value: unknown, legacyQuality: number): MaterialQuality {
  const resolved = value === undefined || value === null ? legacyQuality : value;
  if (!isMaterialQuality(resolved)) throw new Error('Ungültige Materialqualität; erwartet S1 bis S6.');
  return resolved;
}

export function materialQualityFactor(quality: MaterialQuality): number {
  if (!isMaterialQuality(quality)) throw new Error('Ungültige Materialqualität.');
  return GENERATED_MATERIAL_QUALITY[quality - 1].statFactor;
}

/** Keep small percentage bonuses; round only to six decimal places, never whole percent. */
export function scaleMaterialStat(value: number, quality: MaterialQuality): number {
  const scaled = value * materialQualityFactor(quality);
  if (!Number.isFinite(scaled)) throw new Error('Ungültiger Materialwert.');
  return Math.sign(scaled) * Math.round(Math.abs(scaled) * 1_000_000 + 1e-9) / 1_000_000;
}

/** Independent of material ID, dungeon and rune rolls. No pity counter or upgrade. */
export function rollMaterialQuality(roll: number): MaterialQuality {
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new Error('Ungültiger Qualitätswurf.');
  let cumulative = 0;
  for (const rule of GENERATED_MATERIAL_QUALITY) {
    cumulative += rule.weightPerMillion;
    if (roll < cumulative / 1_000_000) return rule.quality as MaterialQuality;
  }
  throw new Error('Qualitätsgewichte ergeben keine vollständige Verteilung.');
}
