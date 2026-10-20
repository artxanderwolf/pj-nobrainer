import { readFileSync, writeFileSync } from 'node:fs';

function replaceOnce(path, from, to) {
  const source = readFileSync(path, 'utf8');
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${path}: erwarteter Anker ${JSON.stringify(from.slice(0, 80))} wurde ${count}× gefunden.`);
  writeFileSync(path, source.replace(from, to), 'utf8');
}

function replaceRange(path, startMarker, endMarker, replacement) {
  const source = readFileSync(path, 'utf8');
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`${path}: Startanker fehlt: ${startMarker}`);
  if (source.indexOf(startMarker, start + startMarker.length) >= 0) throw new Error(`${path}: Startanker ist nicht eindeutig: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`${path}: Endanker fehlt: ${endMarker}`);
  writeFileSync(path, source.slice(0, start) + replacement + source.slice(end), 'utf8');
}

const lines = (...value) => value.join('\n');

// Dungeon-Domain: Materialidentität vollständig auf materialId + ID-keyed Stores umstellen.
const dungeon = 'src/app/core/game-dungeon.service.ts';
replaceOnce(
  dungeon,
  "  MATERIALS,\n  calculateCharacterStats,\n  getMaterialById,",
  "  calculateCharacterStats,\n  getMaterialIdByName,\n  getMaterialReferenceById,"
);
replaceOnce(
  dungeon,
  "import {\n  characterStatLevelMultiplier,\n  grantCharacterExperience\n} from '../game/character-progression-core';",
  "import {\n  characterStatLevelMultiplier,\n  grantCharacterExperience\n} from '../game/character-progression-core';\nimport {\n  addMaterialQuantityById,\n  getMaterialStorageEntries,\n  normalizeMaterialInventory,\n  type MaterialStorageInventory\n} from '../game/material-storage-core';"
);
replaceOnce(
  dungeon,
  "interface RuntimeDungeonInventoryEntry {\n  category?: string;\n  qty?: number | null;\n}\n\n",
  ""
);
replaceOnce(dungeon, "  inventory: Record<string, RuntimeDungeonInventoryEntry | undefined>;", "  inventory: MaterialStorageInventory;");
replaceOnce(dungeon, "  dungeonLoot: Record<string, RuntimeDungeonInventoryEntry | undefined>;", "  dungeonLoot: MaterialStorageInventory;");

replaceRange(
  dungeon,
  '  collectLoot(): DungeonActionResult {',
  '  getSessionWaveCount(): number {',
  lines(
    '  collectLoot(): DungeonActionResult {',
    '    const state = this.getState();',
    '    const outcome = this.createOutcome();',
    '    normalizeMaterialInventory(state.dungeonLoot);',
    '    const entries = getMaterialStorageEntries(state.dungeonLoot).filter(entry => entry.qty > 0);',
    '    if (!entries.length) return outcome;',
    '',
    '    let total = 0;',
    '    for (const entry of entries) {',
    '      const added = addMaterialQuantityById(state.inventory, entry.materialId, entry.qty);',
    '      if (!added) throw new Error(`Dungeon-Beute konnte nicht ins Lager übertragen werden: Material-ID ${entry.materialId}.`);',
    '      delete state.dungeonLoot[String(entry.materialId)];',
    '      total += entry.qty;',
    '    }',
    "    this.addEvent(outcome, `${total} Material${total === 1 ? '' : 'ien'} aus der Dungeon-Beute ins Lager eingesammelt.`, 'good');",
    '    return outcome;',
    '  }',
    '',
    '  /** Migriert alte Namensreferenzen in Dungeon-Beute und ausstehenden Drops auf stabile IDs. */',
    '  normalizeMaterialReferences(): number {',
    '    const state = this.getState();',
    '    let changed = normalizeMaterialInventory(state.dungeonLoot);',
    '    const collect = state.dungeonLootCollect;',
    '    if (!collect?.drops?.length) return changed;',
    '',
    '    for (const drop of collect.drops) {',
    '      const resolved = this.resolveDungeonDrop(drop);',
    '      if (!resolved) continue;',
    '      if (drop.materialId !== resolved.materialId || drop.name !== undefined || drop.category !== undefined) {',
    '        drop.materialId = resolved.materialId;',
    '        delete drop.name;',
    '        delete drop.category;',
    '        changed += 1;',
    '      }',
    '    }',
    '    return changed;',
    '  }',
    '',
    ''
  )
);

replaceOnce(
  dungeon,
  "    resolvedDrops.forEach(drop => {\n      state.dungeonLoot[drop.name] ??= { category: drop.category, qty: 0 };\n      const entry = state.dungeonLoot[drop.name];\n      if (entry) entry.qty = (Number(entry.qty) || 0) + 1;\n    });",
  lines(
    '    resolvedDrops.forEach(drop => {',
    '      const added = addMaterialQuantityById(state.dungeonLoot, drop.materialId, 1);',
    '      if (!added) throw new Error(`Dungeon-Drop konnte nicht gespeichert werden: Material-ID ${drop.materialId}.`);',
    '    });'
  )
);

replaceRange(
  dungeon,
  '    const loot = Object.entries(state.dungeonLoot ?? {})',
  '    const title = reason ===',
  lines(
    '    const loot = getMaterialStorageEntries(state.dungeonLoot)',
    '      .filter(entry => entry.qty > 0)',
    '      .sort((a, b) => a.displayName.localeCompare(b.displayName))',
    '      .map(entry => `${entry.displayName} ×${entry.qty}`);',
    ''
  )
);

replaceRange(
  dungeon,
  '  private getLootTotal(state: RuntimeDungeonState): number {',
  '  private playerAttack(',
  lines(
    '  private getLootTotal(state: RuntimeDungeonState): number {',
    '    return getMaterialStorageEntries(state.dungeonLoot).reduce((sum, entry) => sum + entry.qty, 0);',
    '  }',
    '',
    ''
  )
);

replaceRange(
  dungeon,
  '  private rollDrops(enemies: readonly DungeonEnemy[]): RuntimeDungeonDrop[] {',
  '  private grantWaveExperience(',
  lines(
    '  private rollDrops(enemies: readonly DungeonEnemy[]): RuntimeDungeonDrop[] {',
    '    const result: RuntimeDungeonDrop[] = [];',
    '    for (const enemy of enemies) {',
    '      const candidates = enemy.lootMaterialIds',
    '        .map(materialId => getMaterialReferenceById(materialId))',
    '        .filter((entry): entry is NonNullable<ReturnType<typeof getMaterialReferenceById>> => Boolean(entry));',
    '      if (!candidates.length) continue;',
    '      const selected = candidates[rollWeightedIndex(',
    '        candidates.map(candidate => candidate.definition.dungeonDropWeight),',
    '        Math.random()',
    '      )];',
    '      if (selected) result.push({ materialId: selected.materialId });',
    '    }',
    '    return result;',
    '  }',
    '',
    '  private resolveDungeonDrop(drop: RuntimeDungeonDrop): { materialId: number; name: string; category: string } | null {',
    '    const referenceById = getMaterialReferenceById(drop.materialId);',
    "    const legacyName = typeof drop.name === 'string' && drop.name ? drop.name : null;",
    '    const materialIdByName = getMaterialIdByName(legacyName);',
    '    if (referenceById && materialIdByName !== null && materialIdByName !== referenceById.materialId) {',
    '      throw new Error(',
    '        `Widersprüchliche Materialreferenz im Dungeon-Drop: ${legacyName} verweist auf ID ${materialIdByName}, ` +',
    '        `der Drop auf ID ${referenceById.materialId}.`',
    '      );',
    '    }',
    '',
    '    const reference = referenceById ?? getMaterialReferenceById(materialIdByName);',
    '    if (!reference) return null;',
    '    return {',
    '      materialId: reference.materialId,',
    '      name: reference.displayName,',
    '      category: reference.definition.category',
    '    };',
    '  }',
    '',
    ''
  )
);

// Runtime speichert auch Dungeon-Migrationen sofort zurück.
const runtime = 'src/app/core/game-runtime.service.ts';
replaceOnce(
  runtime,
  "    const materialStorageChanged = this.normalizeMaterialStorage() > 0;\n    const forgeMaterialReferencesChanged = this.gameForge.normalizeMaterialReferences() > 0;\n    const marketMaterialReferencesChanged = this.gameMarket.normalizeMaterialReferences() > 0;\n    const materialReferencesChanged = materialStorageChanged || forgeMaterialReferencesChanged || marketMaterialReferencesChanged;",
  "    const materialStorageChanged = this.normalizeMaterialStorage() > 0;\n    const dungeonMaterialReferencesChanged = this.gameDungeon.normalizeMaterialReferences() > 0;\n    const forgeMaterialReferencesChanged = this.gameForge.normalizeMaterialReferences() > 0;\n    const marketMaterialReferencesChanged = this.gameMarket.normalizeMaterialReferences() > 0;\n    const materialReferencesChanged = materialStorageChanged || dungeonMaterialReferencesChanged || forgeMaterialReferencesChanged || marketMaterialReferencesChanged;"
);

// Markt: Name-Fallback nur noch an der Legacy-Bridge, nicht mehr in der aktiven Rückgabe.
const market = 'src/app/core/game-market.service.ts';
replaceOnce(
  market,
  "      const materialId = job.materialId ?? getMaterialIdByName(job.name);\n      if (materialId === null || materialId === undefined) throw new Error(`Unbekanntes Material im Marktauftrag: ${job.name}`);",
  "      const materialId = job.materialId;\n      if (materialId === null || materialId === undefined) throw new Error(`Unbekannte Material-ID im Marktauftrag: ${job.name}`);"
);

// Version/Save-Schema.
replaceOnce('package.json', '"version": "0.13.12"', '"version": "0.13.13"');
replaceOnce("src/app/game/app-shell-presentation-core.ts", "export const APP_UI_VERSION = '0.13.12';", "export const APP_UI_VERSION = '0.13.13';");
replaceOnce('src/app/game/save-codec.ts', 'export const SAVE_VERSION = 11;', 'export const SAVE_VERSION = 12;');

console.log('v0.13.13 Dungeon-/Storage-ID-Codemod angewendet.');
