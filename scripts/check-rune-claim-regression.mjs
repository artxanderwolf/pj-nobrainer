import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createInitialCityLayout } from '../src/app/game/city-layout-core.ts';
import { grantDroppedRune, availableRuneItems } from '../src/app/game/rune-inventory-core.ts';

const source=path=>readFileSync(path,'utf8');
const dungeon=source('src/app/core/game-dungeon.service.ts');
const session=source('src/app/core/game-dungeon-session.service.ts');
const presentation=source('src/app/core/game-dungeon-presentation.service.ts');

assert.match(dungeon,/const runeWorld=this\.gameState\.getState<MutableGameState & RuneWorldState>\(\)/,
 'Runen duerfen nicht in einem kurzlebigen Dungeon-Adapter angelegt werden');
assert.match(dungeon,/grantDroppedRune\(runeWorld,rune\)/,
 'Runenvergabe muss den tatsaechlichen Root-Save veraendern');
assert.match(session,/this\.isRunActive\(teamId\) && !\(this\.getState\(teamId\)\.session\.dungeonRuneLoot\?\.length\)/,
 'Bei aktiver Expedition muss mindestens bereits gefundene Runenbeute abholbar sein');
assert.match(presentation,/this\.dungeonSession\.isRunActive\(\) && !runes\.length/,
 'Rune-only-Loot darf den Einsammeln-Button nicht sperren');

const world={weaponInventory:[],cityLayout:createInitialCityLayout(),forgeJobs:[],forgeQueue:[],forgeReadyJobs:[]};
const granted=grantDroppedRune(world,'rune-p-1');
assert.equal(granted.runeItemId,'rune-item-1');
assert.equal(world.runeInventory.length,1);
assert.equal(world.nextRuneNumber,2);
assert.equal(world.runeWorkshopUnlocked,true);
assert.equal(availableRuneItems(world).length,1);
const restored=structuredClone(world);
assert.equal(restored.runeInventory[0].runeItemId,granted.runeItemId);
assert.equal(restored.nextRuneNumber,2);
assert.equal(restored.runeWorkshopUnlocked,true);
const second=grantDroppedRune(restored,'rune-ds-2');
assert.equal(second.runeItemId,'rune-item-2','Runen-ID muss nach Save/Reload eindeutig bleiben');
console.log('Runen-Einsammeln: aktiver Lauf freigegeben, Root-Save-Ownership, persistente IDs und Runenwerkstattfreischaltung geprueft.');
