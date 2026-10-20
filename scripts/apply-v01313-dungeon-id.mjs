import { readFileSync, writeFileSync } from 'node:fs';

function replaceOnce(path, from, to) {
  const source = readFileSync(path, 'utf8');
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${path}: erwarteter Anker ${JSON.stringify(from.slice(0, 80))} wurde ${count}× gefunden.`);
  writeFileSync(path, source.replace(from, to), 'utf8');
}

// Dungeon-Domain: Materialidentität vollständig auf materialId + ID-keyed Stores umstellen.
const dungeon = 'src/app/core/game-dungeon.service.ts';
replaceOnce(
  dungeon,
  `  MATERIALS,\n  calculateCharacterStats,\n  getMaterialById,`,
  `  calculateCharacterStats,\n  getMaterialIdByName,\n  getMaterialReferenceById,`
);
replaceOnce(
  dungeon,
  `import {\n  characterStatLevelMultiplier,\n  grantCharacterExperience\n} from '../game/character-progression-core';`,
  `import {\n  characterStatLevelMultiplier,\n  grantCharacterExperience\n} from '../game/character-progression-core';\nimport {\n  addMaterialQuantityById,\n  getMaterialStorageEntries,\n  normalizeMaterialInventory,\n  type MaterialStorageInventory\n} from '../game/material-storage-core';`
);
replaceOnce(
  dungeon,
  `interface RuntimeDungeonInventoryEntry {\n  category?: string;\n  qty?: number | null;\n}\n\n`,
  ``
);
replaceOnce(
  dungeon,
  `  inventory: Record<string, RuntimeDungeonInventoryEntry | undefined>;`,
  `  inventory: MaterialStorageInventory;`
);
replaceOnce(
  dungeon,
  `  dungeonLoot: Record<string, RuntimeDungeonInventoryEntry | undefined>;`,
  `  dungeonLoot: MaterialStorageInventory;`
);
replaceOnce(
  dungeon,
  `  collectLoot(): DungeonActionResult {\n    const state = this.getState();\n    const outcome = this.createOutcome();\n    const entries = Object.entries(state.dungeonLoot ?? {}).filter(([, entry]) => (Number(entry?.qty) || 0) > 0);\n    if (!entries.length) return outcome;\n\n    let total = 0;\n    entries.forEach(([name, entry]) => {\n      const quantity = Number(entry?.qty) || 0;\n      const category = entry?.category || MATERIALS[name]?.category || 'Unbekannt';\n      state.inventory[name] ??= { category, qty: 0 };\n      const inventoryEntry = state.inventory[name];\n      if (!inventoryEntry) return;\n      inventoryEntry.qty = (Number(inventoryEntry.qty) || 0) + quantity;\n      total += quantity;\n    });\n    state.dungeonLoot = {};\n    this.addEvent(outcome, \`${'${total}'} Material${'${total === 1 ? \'\' : \'ien\'}'} aus der Dungeon-Beute ins Lager eingesammelt.\`, 'good');\n    return outcome;\n  }`,
  `  collectLoot(): DungeonActionResult {\n    const state = this.getState();\n    const outcome = this.createOutcome();\n    normalizeMaterialInventory(state.dungeonLoot);\n    const entries = getMaterialStorageEntries(state.dungeonLoot).filter(entry => entry.qty > 0);\n    if (!entries.length) return outcome;\n\n    let total = 0;\n    for (const entry of entries) {\n      const added = addMaterialQuantityById(state.inventory, entry.materialId, entry.qty);\n      if (!added) throw new Error(\`Dungeon-Beute konnte nicht ins Lager übertragen werden: Material-ID ${'${entry.materialId}'}.\`);\n      delete state.dungeonLoot[String(entry.materialId)];\n      total += entry.qty;\n    }\n    this.addEvent(outcome, \`${'${total}'} Material${'${total === 1 ? \'\' : \'ien\'}'} aus der Dungeon-Beute ins Lager eingesammelt.\`, 'good');\n    return outcome;\n  }\n\n  /** Migriert alte Namensreferenzen in Dungeon-Beute und ausstehenden Drops auf stabile IDs. */\n  normalizeMaterialReferences(): number {\n    const state = this.getState();\n    let changed = normalizeMaterialInventory(state.dungeonLoot);\n    const collect = state.dungeonLootCollect;\n    if (!collect?.drops?.length) return changed;\n\n    for (const drop of collect.drops) {\n      const resolved = this.resolveDungeonDrop(drop);\n      if (!resolved) continue;\n      if (drop.materialId !== resolved.materialId || drop.name !== undefined || drop.category !== undefined) {\n        drop.materialId = resolved.materialId;\n        delete drop.name;\n        delete drop.category;\n        changed += 1;\n      }\n    }\n    return changed;\n  }`
);
replaceOnce(
  dungeon,
  `    resolvedDrops.forEach(drop => {\n      state.dungeonLoot[drop.name] ??= { category: drop.category, qty: 0 };\n      const entry = state.dungeonLoot[drop.name];\n      if (entry) entry.qty = (Number(entry.qty) || 0) + 1;\n    });`,
  `    resolvedDrops.forEach(drop => {\n      const added = addMaterialQuantityById(state.dungeonLoot, drop.materialId, 1);\n      if (!added) throw new Error(\`Dungeon-Drop konnte nicht gespeichert werden: Material-ID ${'${drop.materialId}'}.\`);\n    });`
);
replaceOnce(
  dungeon,
  `    const loot = Object.entries(state.dungeonLoot ?? {})\n      .filter(([, entry]) => (Number(entry?.qty) || 0) > 0)\n      .sort((a, b) => a[0].localeCompare(b[0]))\n      .map(([name, entry]) => \`${'${name}'} ×${'${Number(entry?.qty) || 0}'}\`);`,
  `    const loot = getMaterialStorageEntries(state.dungeonLoot)\n      .filter(entry => entry.qty > 0)\n      .sort((a, b) => a.displayName.localeCompare(b.displayName))\n      .map(entry => \`${'${entry.displayName}'} ×${'${entry.qty}'}\`);`
);
replaceOnce(
  dungeon,
  `  private getLootTotal(state: RuntimeDungeonState): number {\n    return Object.values(state.dungeonLoot ?? {}).reduce((sum, entry) => sum + (Number(entry?.qty) || 0), 0);\n  }`,
  `  private getLootTotal(state: RuntimeDungeonState): number {\n    return getMaterialStorageEntries(state.dungeonLoot).reduce((sum, entry) => sum + entry.qty, 0);\n  }`
);
replaceOnce(
  dungeon,
  `  private rollDrops(enemies: readonly DungeonEnemy[]): RuntimeDungeonDrop[] {\n    const result: RuntimeDungeonDrop[] = [];\n    for (const enemy of enemies) {\n      const candidates = enemy.lootMaterialIds\n        .map(materialId => {\n          const resolved = getMaterialById(materialId);\n          return resolved ? { materialId, name: resolved[0], material: resolved[1] } : null;\n        })\n        .filter((entry): entry is { materialId: number; name: string; material: NonNullable<ReturnType<typeof getMaterialById>>[1] } => Boolean(entry));\n      if (!candidates.length) continue;\n      const selected = candidates[rollWeightedIndex(\n        candidates.map(candidate => candidate.material.dungeonDropWeight),\n        Math.random()\n      )];\n      if (selected) {\n        result.push({\n          materialId: selected.materialId,\n          name: selected.name,\n          category: selected.material.category\n        });\n      }\n    }\n    return result;\n  }\n\n  private resolveDungeonDrop(drop: RuntimeDungeonDrop): { materialId: number; name: string; category: string } | null {\n    const resolvedById = getMaterialById(drop.materialId);\n    if (resolvedById) {\n      return {\n        materialId: resolvedById[1].materialId,\n        name: resolvedById[0],\n        category: resolvedById[1].category\n      };\n    }\n\n    const legacyName = String(drop.name ?? '');\n    const legacyDefinition = legacyName ? MATERIALS[legacyName] : null;\n    if (!legacyDefinition) return null;\n    return {\n      materialId: legacyDefinition.materialId,\n      name: legacyName,\n      category: legacyDefinition.category\n    };\n  }`,
  `  private rollDrops(enemies: readonly DungeonEnemy[]): RuntimeDungeonDrop[] {\n    const result: RuntimeDungeonDrop[] = [];\n    for (const enemy of enemies) {\n      const candidates = enemy.lootMaterialIds\n        .map(materialId => getMaterialReferenceById(materialId))\n        .filter((entry): entry is NonNullable<ReturnType<typeof getMaterialReferenceById>> => Boolean(entry));\n      if (!candidates.length) continue;\n      const selected = candidates[rollWeightedIndex(\n        candidates.map(candidate => candidate.definition.dungeonDropWeight),\n        Math.random()\n      )];\n      if (selected) result.push({ materialId: selected.materialId });\n    }\n    return result;\n  }\n\n  private resolveDungeonDrop(drop: RuntimeDungeonDrop): { materialId: number; name: string; category: string } | null {\n    const referenceById = getMaterialReferenceById(drop.materialId);\n    const legacyName = typeof drop.name === 'string' && drop.name ? drop.name : null;\n    const materialIdByName = getMaterialIdByName(legacyName);\n    if (referenceById && materialIdByName !== null && materialIdByName !== referenceById.materialId) {\n      throw new Error(\n        \`Widersprüchliche Materialreferenz im Dungeon-Drop: ${'${legacyName}'} verweist auf ID ${'${materialIdByName}'}, ` +\n        \`der Drop auf ID ${'${referenceById.materialId}'}.\`\n      );\n    }\n\n    const reference = referenceById ?? getMaterialReferenceById(materialIdByName);\n    if (!reference) return null;\n    return {\n      materialId: reference.materialId,\n      name: reference.displayName,\n      category: reference.definition.category\n    };\n  }`
);

// Runtime speichert auch Dungeon-Migrationen sofort zurück.
const runtime = 'src/app/core/game-runtime.service.ts';
replaceOnce(
  runtime,
  `    const materialStorageChanged = this.normalizeMaterialStorage() > 0;\n    const forgeMaterialReferencesChanged = this.gameForge.normalizeMaterialReferences() > 0;\n    const marketMaterialReferencesChanged = this.gameMarket.normalizeMaterialReferences() > 0;\n    const materialReferencesChanged = materialStorageChanged || forgeMaterialReferencesChanged || marketMaterialReferencesChanged;`,
  `    const materialStorageChanged = this.normalizeMaterialStorage() > 0;\n    const dungeonMaterialReferencesChanged = this.gameDungeon.normalizeMaterialReferences() > 0;\n    const forgeMaterialReferencesChanged = this.gameForge.normalizeMaterialReferences() > 0;\n    const marketMaterialReferencesChanged = this.gameMarket.normalizeMaterialReferences() > 0;\n    const materialReferencesChanged = materialStorageChanged || dungeonMaterialReferencesChanged || forgeMaterialReferencesChanged || marketMaterialReferencesChanged;`
);

// Markt: Name-Fallback nur noch an der Legacy-Bridge, nicht mehr in der aktiven Rückgabe.
const market = 'src/app/core/game-market.service.ts';
replaceOnce(
  market,
  `      const materialId = job.materialId ?? getMaterialIdByName(job.name);\n      if (materialId === null || materialId === undefined) throw new Error(\`Unbekanntes Material im Marktauftrag: ${'${job.name}'}\`);`,
  `      const materialId = job.materialId;\n      if (materialId === null || materialId === undefined) throw new Error(\`Unbekannte Material-ID im Marktauftrag: ${'${job.name}'}\`);`
);

// Version/Save-Schema.
replaceOnce('package.json', '"version": "0.13.12"', '"version": "0.13.13"');
replaceOnce("src/app/game/app-shell-presentation-core.ts", "export const APP_UI_VERSION = '0.13.12';", "export const APP_UI_VERSION = '0.13.13';");
replaceOnce('src/app/game/save-codec.ts', 'export const SAVE_VERSION = 11;', 'export const SAVE_VERSION = 12;');

console.log('v0.13.13 Dungeon-/Storage-ID-Codemod angewendet.');
