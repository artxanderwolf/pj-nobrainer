import { GENERATED_DUNGEONS } from './data/generated/game-data.generated.ts';
import { CONFIG } from './game-core.ts';

export type DungeonDefinition = typeof CONFIG.dungeon & {
    displayName: string;
    durationMs: number;
    xpMultiplier: number;
    enemyCaps: { armor: number; dodge: number; hitChance: number };
};
export function getDungeonDefinition(dungeonId = 1): DungeonDefinition {
    const value = (GENERATED_DUNGEONS as Record<number, unknown>)[dungeonId];
    if (!value) throw new Error(`Unbekannte Dungeon-ID ${dungeonId}`);
    return value as DungeonDefinition;
}
