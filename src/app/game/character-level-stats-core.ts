import { clampArmorPercent } from './armor-core';
import { characterLevelStatMultipliers } from './character-progression-core';
import {
  CHARACTER_CLASSES,
  createStatModifiers,
  type CharacterClassId,
  type CharacterModifierKey,
  type CharacterStatModifiers,
  type ResolvedCharacterStats,
  type WeaponLike
} from './game-core';

function addModifiers(target: CharacterStatModifiers, source: Partial<CharacterStatModifiers>): void {
  (Object.keys(target) as CharacterModifierKey[]).forEach(key => {
    target[key] += Number(source[key]) || 0;
  });
}

function scaled(value: number, multiplier: number): number {
  return value === 0 ? 0 : value * multiplier;
}

/**
 * Aktive Level-Statberechnung. Klassen-Grundwerte werden je Stat mit ihrem
 * Levelmultiplikator skaliert; Ausrüstungsboni werden anschließend addiert.
 * Bedrohung bleibt wie bisher eine unveränderte Klasseneigenschaft.
 */
export function calculateCharacterStatsForLevel(
  classId: string | null | undefined,
  weapons: readonly WeaponLike[] = [],
  level: number | null | undefined = 1
): ResolvedCharacterStats {
  const resolvedId = classId && Object.prototype.hasOwnProperty.call(CHARACTER_CLASSES, classId)
    ? classId as CharacterClassId
    : 'recruit';
  const base = CHARACTER_CLASSES[resolvedId];
  const growth = characterLevelStatMultipliers(level);
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
    maxHp: Math.max(1, scaled(base.maxHp, growth.default) + equipment.hp),
    maxEnergy: Math.max(0, scaled(base.maxEnergy, growth.default) + equipment.energy),
    armor: clampArmorPercent(scaled(base.armor, growth.default) + equipment.armor),
    dodge: Math.max(0, Math.min(0.95, scaled(base.dodge, growth.default) + equipment.dodge)),
    strengthFactor: Math.max(0, scaled(base.strengthFactor, growth.strengthFactor) + equipment.strengthFactor),
    precision: Math.max(0, scaled(base.precision, growth.precision) + equipment.precision),
    threat: Math.max(0.01, base.threat),
    critChance: Math.max(0, Math.min(1, scaled(base.critChance, growth.default) + equipment.critChance)),
    critDamage: Math.max(1, scaled(base.critDamage, growth.critDamage) + equipment.critDamage),
    hpRegenPerMinute: Math.max(0, scaled(base.hpRegenPerMinute, growth.default) + equipment.hpRegenPerMinute),
    energyRegenPerMinute: Math.max(0, scaled(base.energyRegenPerMinute, growth.default) + equipment.energyRegenPerMinute),
    experienceFactor: Math.max(0, scaled(base.experienceFactor, growth.experienceFactor) + equipment.experienceFactor),
    lifeSteal: Math.max(0, Math.min(1, scaled(base.lifeSteal, growth.default) + equipment.lifeSteal)),
    penetration: Math.max(0, Math.min(1, scaled(base.penetration, growth.default) + equipment.penetration))
  };
}

export const CHARACTER_LEVEL_STATS_CORE_BRIDGE = { calculateCharacterStatsForLevel };
export type CharacterLevelStatsCoreBridge = typeof CHARACTER_LEVEL_STATS_CORE_BRIDGE;
