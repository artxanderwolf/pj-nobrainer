import { GENERATED_DUNGEONS } from './data/generated/game-data.generated.ts';
import { CONFIG } from './game-core.ts';
export function getDungeonDefinition(dungeonId = 1): typeof CONFIG.dungeon & {
    displayName: string;
    durationMs: number;
} {
    const value = (GENERATED_DUNGEONS as Record<number, unknown>)[dungeonId];
    if (!value)
        throw new Error(`Unbekannte Dungeon-ID ${dungeonId}`);
    return value as typeof CONFIG.dungeon & {
        displayName: string;
        durationMs: number;
    };
}
