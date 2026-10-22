import {
  CHARACTER_CRIT_DAMAGE_GROWTH,
  CHARACTER_EXPERIENCE_FACTOR_GROWTH,
  CHARACTER_LEVEL_MAX,
  CHARACTER_PRECISION_GROWTH,
  CHARACTER_STAT_GROWTH,
  CHARACTER_STRENGTH_FACTOR_GROWTH,
  CHARACTER_XP_BASE,
  CHARACTER_XP_GROWTH
} from './data/generated/character-progression.generated.ts';

export {
  CHARACTER_CRIT_DAMAGE_GROWTH,
  CHARACTER_EXPERIENCE_FACTOR_GROWTH,
  CHARACTER_LEVEL_MAX,
  CHARACTER_PRECISION_GROWTH,
  CHARACTER_STAT_GROWTH,
  CHARACTER_STRENGTH_FACTOR_GROWTH,
  CHARACTER_XP_BASE,
  CHARACTER_XP_GROWTH
};

export interface CharacterProgressionLike {
  level?: number | null;
  xp?: number | null;
}

export interface CharacterProgressionPresentation {
  level: number;
  xp: number;
  xpToNext: number;
  maxLevel: number;
  atMaxLevel: boolean;
  progress: number;
}

export interface CharacterLevelStatMultipliers {
  default: number;
  strengthFactor: number;
  precision: number;
  critDamage: number;
  experienceFactor: number;
}

export interface ExperienceGrantResult {
  gainedXp: number;
  levelsGained: number;
  level: number;
  xp: number;
  xpToNext: number;
  atMaxLevel: boolean;
}

export function normalizeCharacterLevel(level: number | null | undefined): number {
  return Math.max(1, Math.min(CHARACTER_LEVEL_MAX, Math.floor(Number(level) || 1)));
}

export function normalizeCharacterXp(xp: number | null | undefined): number {
  return Math.max(0, Number(xp) || 0);
}

export function characterStatLevelMultiplier(level: number | null | undefined): number {
  return Math.pow(CHARACTER_STAT_GROWTH, normalizeCharacterLevel(level) - 1);
}

export function characterLevelStatMultipliers(level: number | null | undefined): CharacterLevelStatMultipliers {
  const exponent = normalizeCharacterLevel(level) - 1;
  return {
    default: Math.pow(CHARACTER_STAT_GROWTH, exponent),
    strengthFactor: Math.pow(CHARACTER_STRENGTH_FACTOR_GROWTH, exponent),
    precision: Math.pow(CHARACTER_PRECISION_GROWTH, exponent),
    critDamage: Math.pow(CHARACTER_CRIT_DAMAGE_GROWTH, exponent),
    experienceFactor: Math.pow(CHARACTER_EXPERIENCE_FACTOR_GROWTH, exponent)
  };
}

export function experienceRequiredForNextLevel(level: number): number {
  const normalizedLevel = normalizeCharacterLevel(level);
  if (normalizedLevel >= CHARACTER_LEVEL_MAX) return 0;
  return Math.round(CHARACTER_XP_BASE * Math.pow(CHARACTER_XP_GROWTH, normalizedLevel - 1));
}

export function getCharacterProgression(character: CharacterProgressionLike): CharacterProgressionPresentation {
  const level = normalizeCharacterLevel(character.level);
  const atMaxLevel = level >= CHARACTER_LEVEL_MAX;
  const xpToNext = experienceRequiredForNextLevel(level);
  const xp = atMaxLevel ? 0 : Math.min(normalizeCharacterXp(character.xp), Math.max(0, xpToNext - 1));
  return {
    level,
    xp,
    xpToNext,
    maxLevel: CHARACTER_LEVEL_MAX,
    atMaxLevel,
    progress: atMaxLevel || xpToNext <= 0 ? 1 : Math.max(0, Math.min(1, xp / xpToNext))
  };
}

export function grantCharacterExperience(
  character: CharacterProgressionLike,
  baseXp: number,
  experienceFactor = 1
): ExperienceGrantResult {
  let level = normalizeCharacterLevel(character.level);
  let xp = normalizeCharacterXp(character.xp);
  const gainedXp = Math.max(0, Math.round((Number(baseXp) || 0) * Math.max(0, Number(experienceFactor) || 0)));
  xp += gainedXp;
  let levelsGained = 0;

  while (level < CHARACTER_LEVEL_MAX) {
    const needed = experienceRequiredForNextLevel(level);
    if (needed <= 0 || xp < needed) break;
    xp -= needed;
    level += 1;
    levelsGained += 1;
  }

  if (level >= CHARACTER_LEVEL_MAX) xp = 0;
  character.level = level;
  character.xp = xp;
  return {
    gainedXp,
    levelsGained,
    level,
    xp,
    xpToNext: experienceRequiredForNextLevel(level),
    atMaxLevel: level >= CHARACTER_LEVEL_MAX
  };
}

export const CHARACTER_PROGRESSION_CORE_BRIDGE = {
  CHARACTER_LEVEL_MAX,
  CHARACTER_XP_BASE,
  CHARACTER_XP_GROWTH,
  CHARACTER_STAT_GROWTH,
  CHARACTER_STRENGTH_FACTOR_GROWTH,
  CHARACTER_PRECISION_GROWTH,
  CHARACTER_CRIT_DAMAGE_GROWTH,
  CHARACTER_EXPERIENCE_FACTOR_GROWTH,
  normalizeCharacterLevel,
  normalizeCharacterXp,
  characterStatLevelMultiplier,
  characterLevelStatMultipliers,
  experienceRequiredForNextLevel,
  getCharacterProgression,
  grantCharacterExperience
};

export type CharacterProgressionCoreBridge = typeof CHARACTER_PROGRESSION_CORE_BRIDGE;
