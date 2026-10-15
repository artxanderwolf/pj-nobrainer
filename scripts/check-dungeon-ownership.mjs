import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const appComponent = readFileSync('src/app/app.component.ts', 'utf8');
const dungeonService = readFileSync('src/app/core/game-dungeon.service.ts', 'utf8');
const presentationService = readFileSync('src/app/core/game-dungeon-presentation.service.ts', 'utf8');
const runtimeService = readFileSync('src/app/core/game-runtime.service.ts', 'utf8');
const dungeonAdapter = readFileSync('src/app/core/legacy-dungeon-domain-adapter.service.ts', 'utf8');
const registrationAdapter = readFileSync('src/app/core/legacy-runtime-registration-adapter.service.ts', 'utf8');

for (const pattern of [/getDungeonPhase\(state\)/, /resolveSearchStep\(/, /checkDungeonStart\(/, /payDungeonEnergy\(/, /createDungeonEnemies\(/, /createDungeonAttackPoints\(/, /resolveAttack\(/, /rescheduleDungeonAttack\(/, /DUNGEON_LOOT_TABLES/, /resetDungeonCycle\(/]) assert.match(dungeonService, pattern, `Dungeon-Service verliert erwartete Fachlogik: ${pattern}`);
assert.match(dungeonService, /window\.NoBrainerDungeonCompatibility = \{/, 'Die kontrollierte Dungeon-Kompatibilitätsbrücke fehlt.');
assert.doesNotMatch(dungeonAdapter, /NoBrainerDungeonCore|NoBrainerCombatCore|function updateDungeonAutomation\(\)|function playerAttack\(|function startDungeonRun\(/, 'Der Legacy-Dungeon-Adapter enthält wieder Domain-Fachlogik.');

assert.match(presentationService, /getDungeonStatusPresentation\(/, 'Angular-Dungeon-Präsentation nutzt den Status-Core nicht.');
assert.match(presentationService, /getDungeonLootPresentation\(/, 'Angular-Dungeon-Präsentation nutzt den Loot-Core nicht.');
assert.match(presentationService, /getDungeonTeamPresentation\(/, 'Angular-Dungeon-Präsentation nutzt den Team-Core nicht.');
assert.match(presentationService, /getDungeonTeamPickerPresentation\(/, 'Angular-Dungeon-Präsentation nutzt den Team-Picker-Core nicht.');
assert.match(presentationService, /gameDungeon\.toggleAuto\(Date\.now\(\)\)/, 'Automatik-UI delegiert nicht direkt an GameDungeonService.');
assert.match(presentationService, /gameDungeon\.collectLoot\(\)/, 'Loot-UI delegiert nicht direkt an GameDungeonService.');
assert.match(presentationService, /removeAttribute\('onclick'\)/, 'Legacy-Inlinehandler werden beim Dungeon-Cutover nicht entfernt.');

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/); assert.ok(scriptMatch);
const bridgeMatch = dungeonAdapter.match(/const DUNGEON_UI_BRIDGE = `([\s\S]*?)`;/); assert.ok(bridgeMatch);
const startMarker = 'function getDungeonStartCheck(){', endMarker = 'function rollDrops(';
const start = scriptMatch[1].indexOf(startMarker), end = scriptMatch[1].indexOf(endMarker, start + startMarker.length);
assert.ok(start >= 0 && end > start, 'Der Dungeon-Domänenbereich konnte nicht isoliert werden.');
const simulated = scriptMatch[1].slice(0, start) + bridgeMatch[1] + '\n' + scriptMatch[1].slice(end);
new vm.Script(simulated, { filename: 'NoBrainer_GitHub_v0.12.67.dungeon-cutover.js' });
assert.equal(simulated.includes('function updateDungeonAutomation(){'), false);
assert.equal(simulated.includes('function playerAttack('), false);

assert.match(runtimeService, /private readonly gameDungeon: GameDungeonService/, 'GameRuntimeService besitzt keinen Angular-Dungeon-Service.');
assert.match(runtimeService, /private readonly dungeonPresentation: GameDungeonPresentationService/, 'GameRuntimeService besitzt keine Angular-Dungeon-Präsentation.');
assert.match(runtimeService, /const dungeonUpdate = this\.gameDungeon\.update\(\);[\s\S]*this\.applyDungeonResult\(runtime, dungeonUpdate\);/, 'Der Angular-Tick aktualisiert den Dungeon nicht direkt.');
assert.match(runtimeService, /this\.dungeonPresentation\.render\(\);/, 'Der Angular-Tick rendert den Dungeon nicht direkt.');
assert.doesNotMatch(runtimeService, /renderDungeonStatus\(\): void;|renderDungeonLoot\(\): void;|renderTeam\(\): void;/, 'GameRuntimeApi exportiert weiterhin Dungeon-Präsentationscallbacks.');
const registrationMatch = registrationAdapter.match(/const ANGULAR_RUNTIME_REGISTRATION = `([\s\S]*?)`;/); assert.ok(registrationMatch);
assert.doesNotMatch(registrationMatch[1], /renderDungeonStatus,|renderDungeonLoot,|renderTeam:/, 'Legacy-Runtime exportiert weiterhin Dungeon-Präsentation.');
assert.match(appComponent, /const APP_VERSION = '0\.12\.67';/, 'Die App-Version wurde nicht auf v0.12.67 gesetzt.');
console.log('Dungeon-Eigentümerschaft: Domain und aktive Präsentation laufen in Angular; Legacy-Dungeon-Code ist nur noch kontrollierte Start-/Kompatibilitätsschicht.');
