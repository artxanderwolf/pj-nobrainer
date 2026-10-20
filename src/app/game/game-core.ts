import * as baseline from './game-core-v01310-baseline.ts';
import {
  DATA_META,
  GENERATED_CHARACTER_CLASSES,
  GENERATED_CONFIG,
  GENERATED_DUNGEON_ENEMY_DEFINITIONS,
  GENERATED_DUNGEON_LOOT_TABLES,
  GENERATED_MATERIAL_KEYS,
  GENERATED_MATERIAL_SALE_RARITY_BONUS,
  GENERATED_MATERIALS
} from './data/generated/game-data.generated.ts';

function replaceData(target: object, source: object): void {
  const mutable = target as Record<string, unknown>;
  for (const key of Object.keys(mutable)) delete mutable[key];
  Object.assign(mutable, JSON.parse(JSON.stringify(source)) as Record<string, unknown>);
}

if (DATA_META.schemaVersion !== 1 || DATA_META.baselineVersion !== '0.13.10') {
  throw new Error(`Ungültige NoBrainer-Datenbasis: Schema ${DATA_META.schemaVersion}, Baseline ${DATA_META.baselineVersion}.`);
}

replaceData(baseline.CONFIG, GENERATED_CONFIG);
replaceData(baseline.CHARACTER_CLASSES, GENERATED_CHARACTER_CLASSES);
replaceData(baseline.MATERIAL_SALE_RARITY_BONUS, GENERATED_MATERIAL_SALE_RARITY_BONUS);
replaceData(baseline.MATERIALS, GENERATED_MATERIALS);
replaceData(baseline.DUNGEON_ENEMY_DEFINITIONS, GENERATED_DUNGEON_ENEMY_DEFINITIONS);
replaceData(baseline.DUNGEON_LOOT_TABLES, GENERATED_DUNGEON_LOOT_TABLES);

export { DATA_META, GENERATED_MATERIAL_KEYS as MATERIAL_KEYS };
export * from './game-core-v01310-baseline.ts';
