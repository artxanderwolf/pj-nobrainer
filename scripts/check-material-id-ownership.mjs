import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const gameCore = read('src/app/game/game-core.ts');
const forgeCore = read('src/app/game/forge-core.ts');
const forgeService = read('src/app/core/game-forge.service.ts');
const marketCore = read('src/app/game/market-core.ts');
const marketService = read('src/app/core/game-market.service.ts');
const dungeonService = read('src/app/core/game-dungeon.service.ts');
const storageCore = read('src/app/game/material-storage-core.ts');

assert.ok(gameCore.includes('generatedMaterialDefinitionsById'), 'Angular-Materialdefinitionen müssen über stabile IDs indiziert werden.');
assert.equal(gameCore.includes('baseline.MATERIALS[key.displayName]'), false, 'Aktive Materialdefinitionen dürfen nicht per Anzeigename aus der Baseline gelesen werden.');
assert.ok(gameCore.includes('MATERIAL_DEFINITIONS_BY_ID'), 'Ein kanonischer ID-Index für Materialdefinitionen muss exportiert sein.');

assert.ok(forgeCore.includes('canonicalWeaponSlots(slots)'), 'Schmiede-Snapshots müssen kanonische ID-Slots persistieren.');
assert.ok(forgeService.includes('canonicalWeaponSlots(weapon.slots)'), 'Bestehende Waffen müssen auf ID-only Slots migriert werden.');
assert.ok(forgeService.includes('slots: canonicalWeaponSlots(job.slots)'), 'Fertige Waffen dürfen keine Materialnamen in Slots persistieren.');

assert.ok(marketCore.includes('delete job.name'), 'Migrierte Material-Marktaufträge müssen persistierte Anzeigenamen entfernen.');
assert.ok(marketService.includes("type: 'material'"), 'Der aktive Marktpfad muss Materialaufträge explizit erzeugen.');
assert.equal(/type:\s*'material'[\s\S]{0,220}name:\s*unit\.name/.test(marketService), false, 'Neue Material-Marktaufträge dürfen den Anzeigenamen nicht persistieren.');
assert.ok(marketService.includes('getMaterialDisplayNameById'), 'Markt-Anzeigenamen müssen aus der stabilen ID aufgelöst werden.');

assert.ok(storageCore.includes('return String(reference.materialId);'), 'Materiallager muss stabile IDs als kanonische JSON-Schlüssel verwenden.');
assert.ok(dungeonService.includes('return { materialId: reference.materialId };'), 'Neue Dungeon-Drops müssen ID-only gespeichert werden.');

console.log('Material-ID-Ownership: Lager, Dungeon, Schmiede und Markt bleiben technisch ID-basiert; Namen sind nur Anzeige/Legacy-Migration.');
