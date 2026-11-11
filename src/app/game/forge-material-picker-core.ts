import {
  calculateWeaponStats,
  type WeaponCraftingSlotId,
  type WeaponSlot
} from './game-core.ts';
import { getWeaponMaterialColorById, WEAPON_FALLBACK_COLOR } from './weapon-material-colors.ts';

export type ForgeMaterialIconKind = 'wood' | 'metal' | 'leather' | 'other';

export function getForgeMaterialIcon(materialId: number, category: string): {
  color: string;
  kind: ForgeMaterialIconKind;
} {
  // Die Waffen-Darstellung bleibt die einzige Farbquelle. Namen sind nie Schluessel.
  const kind: ForgeMaterialIconKind =
    category === 'Holz' ? 'wood'
      : category === 'Metall' ? 'metal'
        : category === 'Leder' ? 'leather'
          : 'other';
  return { color: getWeaponMaterialColorById(materialId) ?? WEAPON_FALLBACK_COLOR, kind };
}

type StatImpact = { label: string; key: string; unit: 'number' | 'percent-points' | 'percent' };

const WEAPON_EFFECTS: readonly StatImpact[] = [
  { label: 'SCH', key: 'damagePerHit', unit: 'number' },
  { label: 'GES', key: 'attackSpeed', unit: 'number' },
  { label: 'TRF', key: 'hitChance', unit: 'percent-points' },
  { label: 'DS', key: 'penetration', unit: 'percent-points' },
  { label: 'ROH', key: 'expectedRaw', unit: 'number' }
];

const CHARACTER_EFFECTS: readonly StatImpact[] = [
  { label: 'LP', key: 'hp', unit: 'number' },
  { label: 'Energie', key: 'energy', unit: 'number' },
  { label: 'Rüstung', key: 'armor', unit: 'number' },
  { label: 'Ausweichen', key: 'dodge', unit: 'percent-points' },
  { label: 'Stärke', key: 'strengthFactor', unit: 'percent' },
  { label: 'Präzision', key: 'precision', unit: 'percent' },
  { label: 'Kritchance', key: 'critChance', unit: 'percent-points' },
  { label: 'Kritschaden', key: 'critDamage', unit: 'percent' },
  { label: 'LP-Regeneration', key: 'hpRegenPerMinute', unit: 'number' },
  { label: 'Energie-Regeneration', key: 'energyRegenPerMinute', unit: 'number' },
  { label: 'Erfahrung', key: 'experienceFactor', unit: 'percent' },
  { label: 'Lebensraub', key: 'lifeSteal', unit: 'percent-points' }
];

function deltaText(value: number, unit: StatImpact['unit']): string {
  const scaled = unit === 'number' ? value : value * 100;
  const magnitude = Math.abs(scaled).toLocaleString('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  const suffix = unit === 'percent-points' ? ' Prozentpunkte' : unit === 'percent' ? ' %' : '';
  return `${scaled >= 0 ? '+' : '−'}${magnitude}${suffix}`;
}

/**
 * Exakter Beitrag dieses Materials zu den aktuellen Waffen- und Charakterwerten.
 * Ausgangspunkt ist dieselbe Waffenform mit allen anderen momentan ausgewaehlten
 * Teilen, aber ohne dieses Bauteil. Die finale komplette Vorschau bleibt massgeblich.
 */
export function getForgeMaterialEffects(
  weaponForm: string,
  slot: WeaponCraftingSlotId,
  materialId: number,
  currentSlots: readonly WeaponSlot[]
): { weapon: string[]; character: string[] } {
  const baselineSlots = currentSlots.filter(candidate => candidate.slot !== slot);
  const withCandidate = [...baselineSlots, { slot, materialId }];
  const baseline = calculateWeaponStats(baselineSlots, weaponForm);
  const candidate = calculateWeaponStats(withCandidate, weaponForm);
  const output = { weapon: [] as string[], character: [] as string[] };
  const compare = (
    keys: readonly StatImpact[],
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    target: string[]
  ) => {
    for (const { label, key, unit } of keys) {
      const difference = Number(after[key] ?? 0) - Number(before[key] ?? 0);
      if (!Number.isFinite(difference) || Math.abs(difference) < 0.000001) continue;
      target.push(`${label} ${deltaText(difference, unit)}`);
    }
  };
  compare(
    WEAPON_EFFECTS,
    baseline as unknown as Record<string, unknown>,
    candidate as unknown as Record<string, unknown>,
    output.weapon
  );
  compare(
    CHARACTER_EFFECTS,
    baseline.characterModifiers as unknown as Record<string, unknown>,
    candidate.characterModifiers as unknown as Record<string, unknown>,
    output.character
  );
  return output;
}
