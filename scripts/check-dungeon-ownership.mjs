import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const appComponent = readFileSync('src/app/app.component.ts', 'utf8');
const dungeonService = readFileSync('src/app/core/game-dungeon.service.ts', 'utf8');
const runtimeService = readFileSync('src/app/core/game-runtime.service.ts', 'utf8');
const dungeonAdapter = readFileSync('src/app/core/legacy-dungeon-domain-adapter.service.ts', 'utf8');
const registrationAdapter = readFileSync('src/app/core/legacy-runtime-registration-adapter.service.ts', 'utf8');

assert.match(dungeonService, /constructor\(private readonly gameState: GameStateService\)/, 'Der Angular-Dungeon-Service verwendet den Angular-State nicht.');
assert.match(dungeonService, /getDungeonPhase\(state\)/, 'Die Dungeon-Phasensteuerung läuft nicht über den bestehenden Dungeon-Core.');
assert.match(dungeonService, /resolveSearchStep\(this\.getAliveParticipants\(state\), Math\.random\(\)\)/, 'Dungeon-Suche läuft nicht über den bestehenden Search-Core.');
assert.match(dungeonService, /checkDungeonStart\(this\.getAliveParticipants\(state\)\)/, 'Dungeon-Startprüfung läuft nicht über den bestehenden Dungeon-Core.');
assert.match(dungeonService, /payDungeonEnergy\(check\.participants, check\.share\)/, 'Dungeon-Energieverbrauch läuft nicht über den bestehenden Dungeon-Core.');
assert.match(dungeonService, /createDungeonEnemies\(enemyCount, \(\) => Math\.random\(\)\)/, 'Gegnererzeugung läuft nicht über den bestehenden Dungeon-Core.');
assert.match(dungeonService, /createDungeonAttackPoints\(/, 'Die Angriffstimeline wird nicht über den bestehenden Dungeon-Core erzeugt.');
assert.match(dungeonService, /resolveAttack\(/, 'Die Kampfauflösung verwendet den bestehenden Combat-Core nicht.');
assert.match(dungeonService, /rescheduleDungeonAttack\(/, 'Die Angriffstimeline wird nicht über den bestehenden Dungeon-Core fortgeschrieben.');
assert.match(dungeonService, /DUNGEON_LOOT_TABLES/, 'Die bestehende Dungeon-Drop-Tabelle wird nicht verwendet.');
assert.match(dungeonService, /resetDungeonCycle\(/, 'Niederlagen setzen das ursprüngliche Team nicht über den Dungeon-Core zurück.');
assert.match(dungeonService, /window\.NoBrainerDungeonCompatibility = \{/, 'Die kontrollierte Dungeon-UI-Kompatibilitätsbrücke fehlt.');
assert.match(dungeonService, /delete window\.NoBrainerDungeonCompatibility;/, 'Die Dungeon-Kompatibilitätsbrücke kann nicht entfernt werden.');

assert.doesNotMatch(dungeonAdapter, /NoBrainerDungeonCore|NoBrainerCombatCore/, 'Der Legacy-Dungeon-Adapter registriert weiterhin Domain-Cores global.');
assert.doesNotMatch(dungeonAdapter, /function updateDungeonAutomation\(\)/, 'Der Legacy-Dungeon-Adapter enthält weiterhin die Dungeon-Ticklogik.');
assert.doesNotMatch(dungeonAdapter, /function playerAttack\(/, 'Der Legacy-Dungeon-Adapter enthält weiterhin Kampf-Fachlogik.');
assert.doesNotMatch(dungeonAdapter, /function startDungeonRun\(/, 'Der Legacy-Dungeon-Adapter enthält weiterhin die Laufstart-Fachlogik.');
assert.match(dungeonAdapter, /getDungeonCompatibility\(\)\.toggleAuto\(Date\.now\(\)\)/, 'Der Legacy-Automatikbutton delegiert nicht an Angular.');
assert.match(dungeonAdapter, /getDungeonCompatibility\(\)\.collectLoot\(\)/, 'Das manuelle Beute-Einsammeln delegiert nicht an Angular.');
assert.match(dungeonAdapter, /getDungeonCompatibility\(\)\.getSessionWaveCount\(\)/, 'Der Wellenzähler delegiert nicht an Angular.');

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
assert.ok(scriptMatch, 'Legacy-JavaScript konnte für den Dungeon-Cutover nicht extrahiert werden.');
const bridgeMatch = dungeonAdapter.match(/const DUNGEON_UI_BRIDGE = `([\s\S]*?)`;/);
assert.ok(bridgeMatch, 'Die Dungeon-UI-Brücke konnte nicht aus dem Adapter gelesen werden.');
const startMarker = 'function getDungeonStartCheck(){';
const endMarker = 'function rollDrops(';
const start = scriptMatch[1].indexOf(startMarker);
const end = scriptMatch[1].indexOf(endMarker, start + startMarker.length);
assert.ok(start >= 0 && end > start, 'Der Dungeon-Domänenbereich konnte in der Legacy-Referenz nicht isoliert werden.');
const simulated = scriptMatch[1].slice(0, start) + bridgeMatch[1] + '\n' + scriptMatch[1].slice(end);
new vm.Script(simulated, { filename: 'NoBrainer_GitHub_v0.12.66.dungeon-cutover.js' });
assert.equal(simulated.includes('function updateDungeonAutomation(){'), false, 'Legacy-updateDungeonAutomation bleibt nach dem Cutover erhalten.');
assert.equal(simulated.includes('function playerAttack('), false, 'Legacy-Spielerangriff bleibt nach dem Cutover erhalten.');
assert.equal(simulated.split('function toggleDungeonAuto(){').length - 1, 1, 'Dungeon-Automatikwrapper ist nicht eindeutig.');
assert.equal(simulated.split('function collectDungeonLoot(){').length - 1, 1, 'Dungeon-Beutewrapper ist nicht eindeutig.');
assert.ok(simulated.includes('function rollDrops('), 'Der nachfolgende Legacy-Bereich wurde beim Dungeon-Cutover beschädigt.');

assert.match(runtimeService, /private readonly gameDungeon: GameDungeonService/, 'GameRuntimeService besitzt keinen Angular-Dungeon-Service.');
assert.match(runtimeService, /const dungeonUpdate = this\.gameDungeon\.update\(\);[\s\S]*this\.applyDungeonResult\(runtime, dungeonUpdate\);/, 'Der Angular-Tick aktualisiert den Dungeon nicht direkt.');
assert.doesNotMatch(runtimeService, /\bupdateDungeonAutomation\(\): void;/, 'GameRuntimeApi enthält weiterhin einen Legacy-Dungeon-Callback.');
assert.doesNotMatch(runtimeService, /runtime\.updateDungeonAutomation\(\)/, 'GameRuntimeService ruft weiterhin den Legacy-Dungeon-Tick auf.');

const registrationMatch = registrationAdapter.match(/const ANGULAR_RUNTIME_REGISTRATION = `([\s\S]*?)`;/);
assert.ok(registrationMatch, 'Die Angular-Runtime-Registrierung konnte nicht gelesen werden.');
assert.doesNotMatch(registrationMatch[1], /\n  updateDungeonAutomation,/, 'Die Legacy-Runtime exportiert weiterhin updateDungeonAutomation.');

const openMarketIndex = appComponent.indexOf('this.gameMarket.openLegacyCompatibilityBridge();');
const openDungeonIndex = appComponent.indexOf('this.gameDungeon.openLegacyCompatibilityBridge();');
const openStateIndex = appComponent.indexOf('this.gameState.openBootstrapRegistration();');
assert.ok(
  openMarketIndex >= 0 && openDungeonIndex > openMarketIndex && openStateIndex > openDungeonIndex,
  'Die Dungeon-Kompatibilitätsbrücke wird nicht vor State- und Runtime-Bootstrap geöffnet.'
);
assert.match(appComponent, /ngOnDestroy\(\): void \{[\s\S]*this\.gameDungeon\.closeLegacyCompatibilityBridge\(\);/, 'Die Dungeon-Kompatibilitätsbrücke wird beim App-Abbau nicht geschlossen.');
assert.match(appComponent, /const APP_VERSION = '0\.12\.66';/, 'Die App-Version wurde nicht auf v0.12.66 gesetzt.');

console.log('Dungeon-Eigentümerschaft: Suche, Automatik, Kampf, Wellen, Loot und Catch-up laufen im Angular-GameDungeonService; Legacy-Code enthält nur noch UI-Kompatibilitätswrapper.');
