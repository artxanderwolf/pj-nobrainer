import { clampArmorPercent } from './armor-core.ts';
import {
  CHARACTER_CRIT_DAMAGE_GROWTH,
  CHARACTER_EXPERIENCE_FACTOR_GROWTH,
  CHARACTER_PRECISION_GROWTH,
  CHARACTER_STAT_GROWTH,
  CHARACTER_STRENGTH_FACTOR_GROWTH
} from './character-progression-core.ts';
import { GENERATED_CHARACTER_CLASSES } from './data/generated/game-data.generated.ts';
import {
  createStatModifiers,
  type CharacterClassDefinition,
  type CharacterModifierKey,
  type CharacterStatModifiers,
  type ResolvedCharacterStats,
  type WeaponLike
} from './game-core-v01310-baseline.ts';

type CharacterClassId = keyof typeof GENERATED_CHARACTER_CLASSES;
const CHARACTER_CLASSES = GENERATED_CHARACTER_CLASSES as unknown as Record<CharacterClassId, Omit<CharacterClassDefinition, 'id'> & {id: CharacterClassId}>;

function addModifiers(target: CharacterStatModifiers, source: Partial<CharacterStatModifiers>): void {
  (Object.keys(target) as CharacterModifierKey[]).forEach(key => {
    target[key] += Number(source[key]) || 0;
  });
}

function scaled(value: number, multiplier: number): number {
  return value === 0 ? 0 : value * multiplier;
}

function growthExponentFromDefaultMultiplier(baseStatMultiplier: number): number {
  const standardGrowth = Number(CHARACTER_STAT_GROWTH);
  if (standardGrowth === 1) return 0;
  const exponent = Math.log(baseStatMultiplier) / Math.log(standardGrowth);
  return Number.isFinite(exponent) ? exponent : 0;
}

/**
 * Aktive Level-Statberechnung. Der bestehende Standardmultiplikator bleibt die
 * API-Grenze; daraus wird die Levelstufe für die stat-spezifischen Faktoren
 * abgeleitet. Ausrüstungsboni werden weiterhin erst nach der Klassenbasis addiert.
 */
export function calculateCharacterStats(
  classId: string | null | undefined,
  weapons: readonly WeaponLike[] = [],
  baseStatMultiplier = 1
): ResolvedCharacterStats {
  const resolvedId = classId && Object.prototype.hasOwnProperty.call(CHARACTER_CLASSES, classId)
    ? classId as CharacterClassId
    : 'recruit';
  const base = CHARACTER_CLASSES[resolvedId];
  const numericMultiplier = Number(baseStatMultiplier);
  const defaultMultiplier = Number.isFinite(numericMultiplier) && numericMultiplier > 0 ? numericMultiplier : 1;
  const exponent = growthExponentFromDefaultMultiplier(defaultMultiplier);
  const strengthFactorMultiplier = Math.pow(CHARACTER_STRENGTH_FACTOR_GROWTH, exponent);
  const precisionMultiplier = Math.pow(CHARACTER_PRECISION_GROWTH, exponent);
  const critDamageMultiplier = Math.pow(CHARACTER_CRIT_DAMAGE_GROWTH, exponent);
  const experienceFactorMultiplier = Math.pow(CHARACTER_EXPERIENCE_FACTOR_GROWTH, exponent);
  const equipment = createStatModifiers();
  const seenIds = new Set<number>();
  const seenWeapons = new Set<WeaponLike>();

  for (const weapon of weapons) {
    const id = Number(weapon.id);
    if (Number.isFinite(id)) {
      if (seenIds.has(id)) continue;
      seenIds.add(id);
    } else {
      if (seenWeapons.has(weapon)) continue;
      seenWeapons.add(weapon);
    }
    addModifiers(equipment, weapon.stats?.characterModifiers ?? {});
  }

  return {
    maxHp: Math.max(1, scaled(base.maxHp, defaultMultiplier) + equipment.hp),
    maxEnergy: Math.max(0, scaled(base.maxEnergy, defaultMultiplier) + equipment.energy),
    armor: clampArmorPercent(scaled(base.armor, defaultMultiplier) + equipment.armor),
    dodge: Math.max(0, Math.min(0.95, scaled(base.dodge, defaultMultiplier) + equipment.dodge)),
    strengthFactor: Math.max(0, scaled(base.strengthFactor, strengthFactorMultiplier) + equipment.strengthFactor),
    precision: Math.max(0, scaled(base.precision, precisionMultiplier) + equipment.precision),
    threat: Math.max(0.01, base.threat),
    critChance: Math.max(0, Math.min(1, scaled(base.critChance, defaultMultiplier) + equipment.critChance)),
    critDamage: Math.max(1, scaled(base.critDamage, critDamageMultiplier) + equipment.critDamage),
    hpRegenPerMinute: Math.max(0, scaled(base.hpRegenPerMinute, defaultMultiplier) + equipment.hpRegenPerMinute),
    energyRegenPerMinute: Math.max(0, scaled(base.energyRegenPerMinute, defaultMultiplier) + equipment.energyRegenPerMinute),
    experienceFactor: Math.max(0, scaled(base.experienceFactor, experienceFactorMultiplier) + equipment.experienceFactor),
    lifeSteal: Math.max(0, Math.min(1, scaled(base.lifeSteal, defaultMultiplier) + equipment.lifeSteal)),
    penetration: Math.max(0, Math.min(1, scaled(base.penetration, defaultMultiplier) + equipment.penetration))
  };
}

export const CHARACTER_LEVEL_STATS_CORE_BRIDGE = { calculateCharacterStats };
export type CharacterLevelStatsCoreBridge = typeof CHARACTER_LEVEL_STATS_CORE_BRIDGE;
