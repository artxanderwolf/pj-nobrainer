import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appComponent = readFileSync('src/app/app.component.ts', 'utf8');
const dungeonService = readFileSync('src/app/core/game-dungeon.service.ts', 'utf8');
const presentationService = readFileSync('src/app/core/game-dungeon-presentation.service.ts', 'utf8');
const runtimeService = readFileSync('src/app/core/game-runtime.service.ts', 'utf8');
const dungeonAdapter = readFileSync('src/app/core/legacy-dungeon-domain-adapter.service.ts', 'utf8');
const presentationAdapter = readFileSync('src/app/core/legacy-dungeon-presentation-adapter.service.ts', 'utf8');
const characterPresentationAdapter = readFileSync('src/app/core/legacy-character-presentation-adapter.service.ts', 'utf8');
const registrationAdapter = readFileSync('src/app/core/legacy-runtime-registration-adapter.service.ts', 'utf8');

for (const pattern of [/getDungeonPhase\(state\)/, /resolveSearchStep\(/, /checkDungeonStart\(/, /payDungeonEnergy\(/, /createDungeonEnemies\(/, /createDungeonAttackPoints\(/, /resolveAttack\(/, /rescheduleDungeonAttack\(/, /DUNGEON_LOOT_TABLES/, /resetDungeonCycle\(/]) {
  assert.match(dungeonService, pattern, `Dungeon-Service verliert erwartete Fachlogik: ${pattern}`);
}
assert.doesNotMatch(dungeonService, /NoBrainerDungeonCompatibility|openLegacyCompatibilityBridge|closeLegacyCompatibilityBridge/, 'GameDungeonService enthält weiterhin die alte Dungeon-Kompatibilitätsbrücke.');

assert.match(presentationService, /private renderOverview\(\): void/, 'Die Dungeon-Basiswerte werden nicht durch die Angular-Präsentation gerendert.');
assert.match(presentationService, /this\.gameEnergy\.costPerCharacter\(displayedCount\)/, 'Die Angular-Dungeon-Präsentation verwendet für Energiekosten nicht den bestehenden Energy-Service.');
assert.match(presentationService, /getDungeonStatusPresentation\(/, 'Angular-Dungeon-Präsentation nutzt den Status-Core nicht.');
assert.match(presentationService, /getDungeonLootPresentation\(/, 'Angular-Dungeon-Präsentation nutzt den Loot-Core nicht.');
assert.match(presentationService, /getDungeonTeamPresentation\(/, 'Angular-Dungeon-Präsentation nutzt den Team-Core nicht.');
assert.match(presentationService, /getDungeonTeamPickerPresentation\(/, 'Angular-Dungeon-Präsentation nutzt den Team-Picker-Core nicht.');
assert.match(presentationService, /gameDungeon\.toggleAuto\(Date\.now\(\)\)/, 'Automatik-UI delegiert nicht direkt an GameDungeonService.');
assert.match(presentationService, /gameDungeon\.collectLoot\(\)/, 'Loot-UI delegiert nicht direkt an GameDungeonService.');
assert.match(presentationService, /state\.dungeonCycleOriginalIds = \[\];[\s\S]*state\.dungeonCycleActiveIds = \[\];/, 'Teamänderungen setzen den vorherigen Dungeon-Zyklus nicht zurück.');

assert.doesNotMatch(dungeonAdapter, /DUNGEON_UI_BRIDGE|NoBrainerDungeonCompatibility|toggleDungeonAuto|collectDungeonLoot/, 'Der Legacy-Dungeon-Domain-Adapter enthält weiterhin Kompatibilitätswrapper.');
assert.match(dungeonAdapter, /return source\.slice\(0, start\) \+ source\.slice\(end\);/, 'Der Legacy-Dungeon-Domainbereich wird nicht vollständig entfernt.');
assert.doesNotMatch(presentationAdapter, /NoBrainerDungeonPresentationCore|getDungeonStatusPresentation|getDungeonLootPresentation/, 'Der Legacy-Dungeon-Präsentationsadapter registriert weiterhin einen Presentation-Core oder baut Legacy-Renderer auf.');
assert.match(presentationAdapter, /'function renderDungeonStatus\(\)\{'/, 'Der Dungeon-Präsentations-Cutover besitzt keinen Status-Startanker.');
assert.match(presentationAdapter, /'function render\(\)\{'/, 'Der Dungeon-Präsentations-Cutover besitzt keinen Gesamtrender-Endanker.');
assert.match(presentationAdapter, /'renderDungeonStatus\(\);renderDungeonLoot\(\);renderForgePreview\(\);'/, 'Die alten Dungeon-Aufrufe werden nicht aus dem Legacy-Gesamtrender entfernt.');
assert.doesNotMatch(characterPresentationAdapter, /ADAPTED_DUNGEON_TEAM|ADAPTED_DUNGEON_TEAM_PICKER/, 'Der Charakter-Präsentationsadapter erzeugt weiterhin eine zweite Dungeon-Team-Präsentation.');

assert.match(runtimeService, /private readonly gameDungeon: GameDungeonService/, 'GameRuntimeService besitzt keinen Angular-Dungeon-Service.');
assert.match(runtimeService, /private readonly dungeonPresentation: GameDungeonPresentationService/, 'GameRuntimeService besitzt keine Angular-Dungeon-Präsentation.');
assert.match(runtimeService, /const dungeonUpdate = this\.gameDungeon\.update\(\);[\s\S]*this\.applyDungeonResult\(runtime, dungeonUpdate\);/, 'Der Angular-Tick aktualisiert den Dungeon nicht direkt.');
assert.match(runtimeService, /this\.dungeonPresentation\.render\(\);/, 'Der Angular-Tick rendert den Dungeon nicht direkt.');
assert.doesNotMatch(runtimeService, /renderDungeonStatus\(\): void;|renderDungeonLoot\(\): void;|renderTeam\(\): void;/, 'GameRuntimeApi exportiert weiterhin Dungeon-Präsentationscallbacks.');

const registrationMatch = registrationAdapter.match(/const ANGULAR_RUNTIME_REGISTRATION = `([\s\S]*?)`;/);
assert.ok(registrationMatch, 'Die Angular-Runtime-Registrierung konnte nicht gelesen werden.');
assert.doesNotMatch(registrationMatch[1], /renderDungeonStatus,|renderDungeonLoot,|renderTeam:|updateDungeonAutomation,/, 'Legacy-Runtime exportiert weiterhin Dungeon-Fach- oder Präsentationscallbacks.');
assert.doesNotMatch(appComponent, /GameDungeonService|NoBrainerDungeonCompatibility|gameDungeon\.openLegacyCompatibilityBridge|gameDungeon\.closeLegacyCompatibilityBridge/, 'AppComponent verwaltet weiterhin die alte Dungeon-Kompatibilitätsbrücke.');
assert.match(appComponent, /const APP_VERSION = '0\.12\.68';/, 'Die App-Version wurde nicht auf v0.12.68 gesetzt.');

console.log('Dungeon-Eigentümerschaft: Domain, Übersicht, Status, Loot und Team laufen ausschließlich über Angular; die alte Dungeon-Kompatibilitäts- und Präsentationsschicht ist aus dem laufenden Legacy-Script entfernt.');
