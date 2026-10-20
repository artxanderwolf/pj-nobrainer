import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/app/core/game-dungeon-presentation.service.ts';
let source = readFileSync(path, 'utf8');
function replaceOnce(from, to) {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`Dungeon-Präsentation: Anker ${JSON.stringify(from.slice(0, 80))} wurde ${count}× gefunden.`);
  source = source.replace(from, to);
}

replaceOnce(
  "import { getDungeonLootPresentation, getDungeonStatusPresentation } from '../game/dungeon-presentation-core';",
  "import { getDungeonLootPresentation, getDungeonStatusPresentation } from '../game/dungeon-presentation-core';\nimport { getMaterialStorageEntries, type MaterialStorageInventory } from '../game/material-storage-core';"
);
replaceOnce(
  "  dungeonLoot: Record<string, { qty: number } | undefined>;",
  "  dungeonLoot: MaterialStorageInventory;"
);
replaceOnce(
  "    const presentation = getDungeonLootPresentation(state.dungeonLoot ?? {});",
  "    const presentation = getDungeonLootPresentation(\n      getMaterialStorageEntries(state.dungeonLoot).map(entry => ({ name: entry.displayName, qty: entry.qty }))\n    );"
);
replaceOnce(
  "  private getLootTotal(state: DungeonPresentationState): number {\n    return Object.values(state.dungeonLoot ?? {}).reduce((sum, entry) => sum + (Number(entry?.qty) || 0), 0);\n  }",
  "  private getLootTotal(state: DungeonPresentationState): number {\n    return getMaterialStorageEntries(state.dungeonLoot).reduce((sum, entry) => sum + entry.qty, 0);\n  }"
);

writeFileSync(path, source, 'utf8');
console.log('Dungeon-Präsentation auf ID-keyed Loot umgestellt.');
