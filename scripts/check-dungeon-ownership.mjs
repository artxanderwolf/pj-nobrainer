import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const appComponent = readFileSync('src/app/app.component.ts', 'utf8');
const dungeonService = readFileSync('src/app/core/game-dungeon.service.ts', 'utf8');
const dungeonPresentationService = readFileSync('src/app/core/game-dungeon-presentation.service.ts', 'utf8');
const runtimeService = readFileSync('src/app/core/game-runtime.service.ts', 'utf8');
const dungeonAdapter = readFileSync('src/app/core/legacy-dungeon-domain-adapter.service.ts', 'utf8');
const dungeonPresentationAdapter = readFileSync('src/app/core/legacy-dungeon-presentation-adapter.service.ts', 'utf8');
const characterPresentationAdapter = readFileSync('src/app/core/legacy-character-presentation-adapter.service.ts', 'utf8');
const registrationAdapter = readFileSync('src/app/core/legacy-runtime-registration-adapter.service.ts', 'utf8');
const pageMarkup = readFileSync('src/app/game/page-markup-presentation-core.ts', 'utf8');

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

assert.doesNotMatch(dungeonAdapter, /NoBrainerDungeonCore|NoBrainerCombatCore/, 'Der Legacy-Dungeon-Adapter registriert weiterhin Domain-Cores global.');
assert.doesNotMatch(dungeonAdapter, /toggleDungeonAuto|collectDungeonLoot|renderDungeonSessionWaveCounter/, 'Der Legacy-Dungeon-Domain-Adapter enthält weiterhin UI-Aktionswrapper.');
assert.doesNotMatch(dungeonAdapter, /function updateDungeonAutomation\(\)/, 'Der Legacy-Dungeon-Adapter enthält weiterhin die Dungeon-Ticklogik.');
assert.doesNotMatch(dungeonAdapter, /function playerAttack\(/, 'Der Legacy-Dungeon-Adapter enthält weiterhin Kampf-Fachlogik.');
assert.doesNotMatch(dungeonAdapter, /function startDungeonRun\(/, 'Der Legacy-Dungeon-Adapter enthält weiterhin die Laufstart-Fachlogik.');

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
assert.ok(scriptMatch, 'Legacy-JavaScript konnte für den Dungeon-Cutover nicht extrahiert werden.');
const startMarker = 'function getDungeonStartCheck(){';
const endMarker = 'function rollDrops(';
const start = scriptMatch[1].indexOf(startMarker);
const end = scriptMatch[1].indexOf(endMarker, start + startMarker.length);
assert.ok(start >= 0 && end > start, 'Der Dungeon-Domänenbereich konnte in der Legacy-Referenz nicht isoliert werden.');
const simulated = scriptMatch[1].slice(0, start) + scriptMatch[1].slice(end);
new vm.Script(simulated, { filename: 'NoBrainer_GitHub_v0.12.67.dungeon-domain-cutover.js' });
assert.equal(simulated.includes('function updateDungeonAutomation(){'), false, 'Legacy-updateDungeonAutomation bleibt nach dem Cutover erhalten.');
assert.equal(simulated.includes('function playerAttack('), false, 'Legacy-Spielerangriff bleibt nach dem Cutover erhalten.');
assert.equal(simulated.includes('function toggleDungeonAuto(){'), false, 'Legacy-Dungeon-Automatikwrapper bleibt nach dem Cutover erhalten.');
assert.equal(simulated.includes('function collectDungeonLoot(){'), false, 'Legacy-Dungeon-Beutewrapper bleibt nach dem Cutover erhalten.');
assert.ok(simulated.includes('function rollDrops('), 'Der nachfolgende Legacy-Bereich wurde beim Dungeon-Cutover beschädigt.');

assert.match(dungeonPresentationService, /constructor\([\s\S]*private readonly gameState: GameStateService,[\s\S]*private readonly gameDungeon: GameDungeonService/, 'Der Angular-Dungeon-Präsentationsservice verwendet State und Dungeon-Domain nicht.');
assert.match(dungeonPresentationService, /getDungeonStatusPresentation\(/, 'Dungeon-Status verwendet den bestehenden Presentation-Core nicht.');
assert.match(dungeonPresentationService, /getDungeonLootPresentation\(/, 'Dungeon-Loot verwendet den bestehenden Presentation-Core nicht.');
assert.match(dungeonPresentationService, /getDungeonTeamPresentation\(/, 'Dungeon-Team verwendet den bestehenden Character-Presentation-Core nicht.');
assert.match(dungeonPresentationService, /getDungeonTeamPickerPresentation\(/, 'Dungeon-Team-Picker verwendet den bestehenden Character-Presentation-Core nicht.');
assert.match(dungeonPresentationService, /host\.addEventListener\('click', this\.clickHandler\)/, 'Dungeon-Aktionen werden nicht über Angular-Ereignisdelegation angebunden.');
assert.match(dungeonPresentationService, /data-dungeon-action="assign-team-character"/, 'Die Angular-Teamzuweisung besitzt keinen eindeutigen Aktionsanker.');
assert.match(dungeonPresentationService, /state\.dungeonTeamSlots\[slot\] = characterId;/, 'Die Teamzuweisung aktualisiert den Angular-State nicht.');
assert.match(dungeonPresentationService, /state\.dungeonTeamSlots\[slot\] = null;/, 'Das Entfernen aus dem Dungeon-Team aktualisiert den Angular-State nicht.');
assert.match(dungeonPresentationService, /window\.NoBrainerDungeonPresentationCompatibility = \{/, 'Die kontrollierte Präsentationsbrücke für verbleibende Legacy-Renderaufrufe fehlt.');
assert.match(dungeonPresentationService, /delete window\.NoBrainerDungeonPresentationCompatibility;/, 'Die Dungeon-Präsentationsbrücke kann nicht entfernt werden.');

assert.match(dungeonPresentationAdapter, /getDungeonPresentationCompatibility\(\)\.renderStatus\(\)/, 'Legacy-renderDungeonStatus delegiert nicht an Angular.');
assert.match(dungeonPresentationAdapter, /getDungeonPresentationCompatibility\(\)\.renderLoot\(\)/, 'Legacy-renderDungeonLoot delegiert nicht an Angular.');
assert.doesNotMatch(dungeonPresentationAdapter, /NoBrainerDungeonPresentationCore/, 'Der Dungeon-Presentation-Core wird weiterhin global in die Legacy-Runtime gespiegelt.');
assert.match(characterPresentationAdapter, /getDungeonPresentationCompatibility\(\)\.renderTeam\(\)/, 'Legacy-renderCharacter routet das Dungeon-Team nicht an Angular.');
assert.doesNotMatch(characterPresentationAdapter, /ADAPTED_DUNGEON_TEAM_PICKER|ADAPTED_DUNGEON_TEAM =/, 'Der Character-Adapter erzeugt weiterhin Dungeon-Team-HTML.');

assert.match(runtimeService, /private readonly gameDungeon: GameDungeonService/, 'GameRuntimeService besitzt keinen Angular-Dungeon-Service.');
assert.match(runtimeService, /private readonly gameDungeonPresentation: GameDungeonPresentationService/, 'GameRuntimeService besitzt keinen Angular-Dungeon-Präsentationsservice.');
assert.match(runtimeService, /const dungeonUpdate = this\.gameDungeon\.update\(\);[\s\S]*this\.applyDungeonResult\(runtime, dungeonUpdate\);/, 'Der Angular-Tick aktualisiert den Dungeon nicht direkt.');
assert.match(runtimeService, /this\.gameDungeonPresentation\.renderAll\(\);/, 'Der Angular-Tick rendert den Dungeon nicht direkt über Angular.');
assert.doesNotMatch(runtimeService, /renderDungeonStatus\(\): void;|renderDungeonLoot\(\): void;|renderTeam\(\): void;/, 'GameRuntimeApi exportiert weiterhin Legacy-Dungeon-Präsentationscallbacks.');
assert.doesNotMatch(runtimeService, /runtime\.renderDungeonStatus\(\)|runtime\.renderDungeonLoot\(\)|runtime\.renderTeam\(\)/, 'GameRuntimeService ruft weiterhin Legacy-Dungeon-Präsentation auf.');

const registrationMatch = registrationAdapter.match(/const ANGULAR_RUNTIME_REGISTRATION = `([\s\S]*?)`;/);
assert.ok(registrationMatch, 'Die Angular-Runtime-Registrierung konnte nicht gelesen werden.');
assert.doesNotMatch(registrationMatch[1], /\n  updateDungeonAutomation,/, 'Die Legacy-Runtime exportiert weiterhin updateDungeonAutomation.');
assert.doesNotMatch(registrationMatch[1], /\n  renderDungeonStatus,|\n  renderDungeonLoot,|renderTeam:/, 'Die Legacy-Runtime exportiert weiterhin Dungeon-Präsentationscallbacks.');

assert.match(pageMarkup, /data-dungeon-action="toggle-auto"/, 'Der Automatikbutton verwendet weiterhin keinen Angular-Aktionsanker.');
assert.match(pageMarkup, /data-dungeon-action="collect-loot"/, 'Der Beutebutton verwendet weiterhin keinen Angular-Aktionsanker.');
assert.doesNotMatch(pageMarkup, /onclick="toggleDungeonAuto\(\)"|onclick="collectDungeonLoot\(\)"/, 'Dungeon-Hauptaktionen verwenden weiterhin globale Legacy-onclick-Handler.');

const attachIndex = appComponent.indexOf('this.gameDungeonPresentation.attach(');
const openPresentationIndex = appComponent.indexOf('this.gameDungeonPresentation.openLegacyCompatibilityBridge();');
const openStateIndex = appComponent.indexOf('this.gameState.openBootstrapRegistration();');
assert.ok(
  attachIndex >= 0 && openPresentationIndex > attachIndex && openStateIndex > openPresentationIndex,
  'Dungeon-Präsentation und Ereignisdelegation werden nicht vor State- und Runtime-Bootstrap vorbereitet.'
);
assert.doesNotMatch(appComponent, /this\.gameDungeon\.openLegacyCompatibilityBridge\(\)/, 'Die veraltete Dungeon-Domain-Kompatibilitätsbrücke wird weiterhin geöffnet.');
assert.match(appComponent, /ngOnDestroy\(\): void \{[\s\S]*this\.gameDungeonPresentation\.closeLegacyCompatibilityBridge\(\);[\s\S]*this\.gameDungeonPresentation\.detach\(\);/, 'Dungeon-Präsentationsbrücke und Ereignisdelegation werden beim App-Abbau nicht entfernt.');
assert.match(appComponent, /const APP_VERSION = '0\.12\.67';/, 'Die App-Version wurde nicht auf v0.12.67 gesetzt.');

console.log('Dungeon-Eigentümerschaft: Domain, Status, Kennzahlen, Loot und Teaminteraktionen liegen in Angular; Legacy-Code enthält nur noch Render-Weiterleitungen für verbleibende Vollrenderpfade.');
