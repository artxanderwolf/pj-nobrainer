import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const appComponent = readFileSync('src/app/app.component.ts', 'utf8');
const runtimeService = readFileSync('src/app/core/game-runtime.service.ts', 'utf8');
const gameTickAdapter = readFileSync('src/app/core/legacy-game-tick-adapter.service.ts', 'utf8');
const registrationAdapter = readFileSync('src/app/core/legacy-runtime-registration-adapter.service.ts', 'utf8');

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
assert.ok(scriptMatch, 'Das Legacy-Script konnte für den gameTick-Regressionscheck nicht extrahiert werden.');
const legacyScript = scriptMatch[1];

const adapterTickMatch = gameTickAdapter.match(/const LEGACY_GAME_TICK_BLOCK = `([\s\S]*?)`;/);
assert.ok(adapterTickMatch, 'Der Legacy-gameTick-Anker fehlt im gameTick-Adapter.');
const legacyTickBlock = adapterTickMatch[1];
assert.ok(legacyScript.includes(legacyTickBlock), 'Der gameTick-Adapter entspricht nicht mehr exakt der Legacy-Referenz.');

const simulatedCutover = legacyScript.replace(legacyTickBlock, '');
assert.doesNotMatch(simulatedCutover, /function gameTick\(\)/, 'Der Legacy-gameTick bleibt nach dem Cutover erhalten.');
assert.match(simulatedCutover, /function updateEnergy\(\)/, 'Die Energie-Kompatibilitätsfunktion wurde beim gameTick-Cutover versehentlich entfernt.');
assert.match(simulatedCutover, /function updateForgeJob\(\)/, 'Die Schmiede-Kompatibilitätsfunktion wurde beim gameTick-Cutover versehentlich entfernt.');
assert.match(simulatedCutover, /function updateMarketJob\(\)/, 'Die Markt-Kompatibilitätsfunktion wurde beim gameTick-Cutover versehentlich entfernt.');
assert.match(simulatedCutover, /function updateDungeonAutomation\(\)/, 'Die Dungeon-Referenzfunktion wurde beim gameTick-Cutover versehentlich entfernt.');

const tickStart = runtimeService.indexOf('private runTickCycle(): void {');
const tickEnd = runtimeService.indexOf('private logForgeCompletions(', tickStart);
assert.ok(tickStart >= 0 && tickEnd > tickStart, 'Der zentrale Angular-Tick-Zyklus konnte nicht isoliert werden.');
const tickCycle = runtimeService.slice(tickStart, tickEnd);

assert.match(runtimeService, /private readonly characterPresentation: GameCharacterPresentationService/, 'Der Angular-Tick besitzt keine Angular-eigene Kader-Präsentation.');
assert.match(runtimeService, /private readonly weaponInventoryPresentation: GameWeaponInventoryPresentationService/, 'Der Angular-Tick besitzt keine Angular-eigene Waffenlager-Präsentation.');
assert.match(runtimeService, /private readonly resourcePresentation: GameResourcePresentationService/, 'Der Angular-Tick besitzt keine Angular-eigene Ressourcen-Präsentation.');
assert.match(runtimeService, /private readonly forgeJobPresentation: GameForgeJobPresentationService/, 'Der Angular-Tick besitzt keine Angular-eigene Schmiedeauftrags-Präsentation.');
assert.match(runtimeService, /private readonly forgePreviewPresentation: GameForgePreviewPresentationService/, 'Der Angular-Tick besitzt keine Angular-eigene Schmiedevorschau-Präsentation.');
assert.match(runtimeService, /private readonly marketJobPresentation: GameMarketJobPresentationService/, 'Der Angular-Tick besitzt keine Angular-eigene Marktauftrags-Präsentation.');
assert.match(runtimeService, /private readonly combatLog: GameCombatLogService/, 'Der Angular-Tick besitzt keinen Angular-eigenen Kampfprotokoll-Service.');
assert.match(runtimeService, /private readonly gameEnergy: GameEnergyService/, 'Der Angular-Tick besitzt keinen Angular-eigenen Energie-Service.');
assert.match(runtimeService, /private readonly gameForge: GameForgeService/, 'Der Angular-Tick besitzt keinen Angular-eigenen Schmiede-Service.');
assert.match(runtimeService, /private readonly gameMarket: GameMarketService/, 'Der Angular-Tick besitzt keinen Angular-eigenen Markt-Service.');
assert.match(runtimeService, /private readonly gameDungeon: GameDungeonService/, 'Der Angular-Tick besitzt keinen Angular-eigenen Dungeon-Service.');
assert.match(runtimeService, /private readonly dungeonPresentation: GameDungeonPresentationService/, 'Der Angular-Tick besitzt keine Angular-eigene Dungeon-Präsentation.');
assert.doesNotMatch(runtimeService, /\bupdateEnergy\(\): void;|runtime\.updateEnergy\(\)/);
assert.doesNotMatch(runtimeService, /\bupdateForgeJob\(\): boolean;|runtime\.updateForgeJob\(\)/);
assert.doesNotMatch(runtimeService, /\bupdateMarketJob\(\): boolean;|runtime\.updateMarketJob\(\)/);
assert.doesNotMatch(runtimeService, /\bupdateDungeonAutomation\(\): void;|runtime\.updateDungeonAutomation\(\)/);
assert.doesNotMatch(runtimeService, /renderDungeonStatus\(\): void;|renderDungeonLoot\(\): void;|renderTeam\(\): void;/);
assert.doesNotMatch(runtimeService, /renderRosterIfIdle|renderWeaponInventory\(\): void;/);
assert.doesNotMatch(runtimeService, /renderForgeJob\(\): void;|runtime\.renderForgeJob\(\)|renderForgePreview\(\): void;|runtime\.renderForgePreview\(\)/);
assert.doesNotMatch(runtimeService, /renderMarketJob\(\): void;|runtime\.renderMarketJob\(\)/, 'Die Runtime-API exportiert weiterhin den Legacy-Marktauftragsrenderer.');
assert.doesNotMatch(runtimeService, /refreshGold\(\): void;|\baddLog\(text: string|runtime\.addLog\(/);

const orderedRuntimeCalls = [
  'this.gameEnergy.update();',
  'const forgeUpdate = this.gameForge.update();',
  'this.logForgeCompletions(forgeUpdate.completedNames);',
  'const marketUpdate = this.gameMarket.update();',
  'const marketCompleted = marketUpdate.completedCount > 0;',
  'this.logMarketCompletions(marketUpdate.completedSales);',
  'const dungeonUpdate = this.gameDungeon.update();',
  'this.applyDungeonResult(runtime, dungeonUpdate);',
  'this.forgeJobPresentation.render();',
  'this.marketJobPresentation.render();',
  'this.characterPresentation.renderIfIdle();',
  'this.dungeonPresentation.render();',
  'if (runtime.shouldAutoSave(Date.now())) runtime.save(false);'
];
let previousIndex = -1;
for (const call of orderedRuntimeCalls) {
  const index = tickCycle.indexOf(call);
  assert.ok(index > previousIndex, `Angular-gameTick-Reihenfolge ist ungültig oder Aufruf fehlt: ${call}`);
  previousIndex = index;
}
assert.match(tickCycle, /if \(forgeCompleted\) \{[\s\S]*this\.forgePreviewPresentation\.render\(\);[\s\S]*this\.weaponInventoryPresentation\.render\(\);[\s\S]*\}/, 'Schmiede-Abschluss-Refresh von Angular-Vorschau und Angular-Waffenlager fehlt im Angular-Tick.');
assert.match(tickCycle, /if \(marketCompleted\) \{[\s\S]*runtime\.renderMarketMaterials\(\);[\s\S]*runtime\.renderMarketWeapons\(\);[\s\S]*this\.resourcePresentation\.render\(\);[\s\S]*\}/, 'Markt-Abschluss-Refresh fehlt im Angular-Tick.');
assert.match(runtimeService, /this\.runTickCycle\(\);[\s\S]*this\.scheduleNextTick\(\);/, 'Der 250-ms-Scheduler verwendet nicht den Angular-Tick-Zyklus.');

const angularRegistrationMatch = registrationAdapter.match(/const ANGULAR_RUNTIME_REGISTRATION = `([\s\S]*?)`;/);
assert.ok(angularRegistrationMatch, 'Die Angular-Runtime-Registrierung konnte nicht geprüft werden.');
const angularRegistration = angularRegistrationMatch[1];
for (const forbidden of ['tick:gameTick', 'updateEnergy,', 'updateForgeJob,', 'updateMarketJob,', 'updateDungeonAutomation,', 'renderDungeonStatus,', 'renderDungeonLoot,', 'renderTeam:', '\n  addLog,', 'renderRosterIfIdle:', '\n  renderWeaponInventory,', '\n  renderForgeJob,', '\n  renderForgePreview,', '\n  renderMarketJob,', 'refreshGold:']) {
  assert.equal(angularRegistration.includes(forbidden), false, `Legacy-Runtime registriert weiterhin ${forbidden}.`);
}
for (const callback of ['renderMarketMaterials', 'renderMarketWeapons', 'renderInventoryState:', 'shouldAutoSave:']) {
  assert.ok(angularRegistration.includes(callback), `Runtime-Callback für den Angular-Tick fehlt: ${callback}`);
}

const sourceAdapterIndex = appComponent.indexOf('let adaptedScript = this.legacySourceAdapter.adapt(source);');
const tickAdapterIndex = appComponent.indexOf('adaptedScript = this.legacyGameTickAdapter.adapt(adaptedScript);');
const registrationAdapterIndex = appComponent.indexOf('adaptedScript = this.legacyRuntimeRegistrationAdapter.adapt(adaptedScript);');
assert.ok(sourceAdapterIndex >= 0 && tickAdapterIndex > sourceAdapterIndex && registrationAdapterIndex > tickAdapterIndex, 'Die Adapterreihenfolge für den gameTick-Cutover ist nicht stabil.');

console.log('gameTick-Eigentümerschaft: Der zentrale 250-ms-Zyklus liegt in Angular; Kader, Waffenlager, Ressourcen, Schmiedeaufträge, Schmiedevorschau, Marktaufträge, Dungeon und Kampfprotokoll werden dort ohne Legacy-Runtime-Präsentationscallbacks verarbeitet.');
