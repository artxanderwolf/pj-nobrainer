import { GENERATED_DUNGEON_PROGRESS_RULES as RULES } from './data/generated/game-data.generated.ts';

export const QUALIFIED_RUN_WAVES = RULES.qualifiedRunWaves;
export const REQUIRED_QUALIFIED_RUNS = RULES.requiredQualifiedRuns;
export const ACCESS_SEARCH_START_WAVE = RULES.accessSearchStartWave;
export const ACCESS_CHANCE = RULES.accessChance;

/** Same fields in Save 27; credit eligible old and new runs exactly once. */
export function creditQualifiedRun(
  qualifiedRuns: Record<number, number>,
  session: { dungeonId: number; waves: number; qualified: boolean } | null | undefined,
  expectedDungeonId: number
): boolean {
  if (!session || session.dungeonId !== expectedDungeonId || expectedDungeonId < 1 || expectedDungeonId > 5 ||
      session.qualified || !Number.isFinite(session.waves) || session.waves < QUALIFIED_RUN_WAVES) return false;
  session.qualified = true;
  qualifiedRuns[expectedDungeonId] = Math.max(0, Math.floor(Number(qualifiedRuns[expectedDungeonId]) || 0)) + 1;
  return true;
}
