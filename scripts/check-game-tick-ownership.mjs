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

const prepareStart = runtimeService.indexOf('  prepare(): void {');
const prepareEnd = runtimeService.indexOf('  startTick(): void {', prepareStart);
assert.ok(prepareStart >= 0 && prepareEnd > prepareStart, 'Die Angular-Startsequenz konnte nicht isoliert werden.');
const prepareCycle = runtimeService.slice(prepareStart, prepareEnd);
const prepareResetIndex = prepareCycle.indexOf('const dungeonSessionReset = this.dungeonSession.close(Date.now());');
const prepareDungeonIndex = prepareCycle.indexOf('const dungeonUpdate = this.dungeonSession.update();');
const prepareEnergyIndex = prepareCycle.indexOf('this.gameEnergy.update();');
assert.ok(prepareResetIndex >= 0, 'Beim Start wird ein alter persistierter Dungeon-Lauf nicht verworfen.');
assert.ok(
  prepareDungeonIndex > prepareResetIndex && prepareEnergyIndex > prepareDungeonIndex,
  'Beim Start muss die geschlossene Dungeon-Sitzung vor der regulären Energieaktualisierung verarbeitet werden.'
);
assert.equal(
  (prepareCycle.match(/this\.gameEnergy\.update\(\);/g) ?? []).length,
  1,
  'Die Startsequenz darf den Energie-Zeitstempel nicht mehrfach aktualisieren.'
);
assert.doesNotMatch(prepareCycle, /this\.gameDungeon\.update\(\)/, 'Dungeon-Fachlogik darf beim Start nicht außerhalb der Popup-Sitzung offline nachlaufen.');

const tickStart = runtimeService.indexOf('private runTickCycle(): void {');
const tickEnd = runtimeService.indexOf('private logForgeCompletions(', tickStart);
assert.ok(tickStart >= 0 && tickEnd > tickStart, 'Der zentrale Angular-Tick-Zyklus konnte nicht isoliert werden.');
const tickCycle = runtimeService.slice(tickStart, tickEnd);

assert.match(runtimeService, /private readonly characterPresentation: GameCharacterPresentationService/, 'Der Angular-Tick besitzt keine Angular-eigene Kader-Präsentation.');
assert.match(runtimeService, /private readonly weaponInventoryPresentation: GameWeaponInventoryPresentationService/, 'Der Angular-Tick besitzt keine Angular-eigene Waffenlager-Präsentation.');
assert.match(runtimeService, /private readonly resourcePresentation: GameResourcePresentationService/, 'Der Angular-Tick besitzt keine Angular-eigene Ressourcen-Präsentation.');
assert.match(runtimeService, /private readonly forgeJobPresentation: GameForgeJobPresentationService/, 'Der Angular-Tick besitzt keine Angular-eigene Schmiedeauftrags-Präsentation.');
assert.match(runtimeService, /private readonly forgePreviewPresentation: GameForgePreviewPresentationService/, 'Der Angular-Tick besitzt keine Angular-eigene Schmiedevorschau-Präsentation.');
assert.match(runtimeService, /private readonly combatLog: GameCombatLogService/, 'Der Angular-Tick besitzt keinen Angular-eigenen Kampfprotokoll-Service.');
assert.match(runtimeService, /private readonly gameEnergy: GameEnergyService/, 'Der Angular-Tick besitzt keinen Angular-eigenen Energie-Service.');
assert.match(runtimeService, /private readonly gameForge: GameForgeService/, 'Der Angular-Tick besitzt keinen Angular-eigenen Schmiede-Service.');
assert.match(runtimeService, /private readonly gameMarket: GameMarketService/, 'Der Angular-Tick besitzt keinen Angular-eigenen Markt-Service.');
assert.match(runtimeService, /private readonly gameDungeon: GameDungeonService/, 'Die Runtime besitzt keinen Angular-eigenen Dungeon-Fachservice für Migration und Loot.');
assert.match(runtimeService, /private readonly dungeonSession: GameDungeonSessionService/, 'Der Angular-Tick besitzt keinen popupgebundenen Dungeon-Session-Service.');
assert.match(runtimeService, /private readonly dungeonPresentation: GameDungeonPresentationService/, 'Der Angular-Tick besitzt keine Angular-eigene Dungeon-Präsentation.');
assert.doesNotMatch(runtimeService, /\bupdateEnergy\(\): void;/, 'Die Runtime-API stellt weiterhin die Legacy-Energieaktualisierung bereit.');
assert.doesNotMatch(runtimeService, /runtime\.updateEnergy\(\)/, 'Der Scheduler ruft weiterhin die Legacy-Energieaktualisierung auf.');
assert.doesNotMatch(runtimeService, /\bupdateForgeJob\(\): boolean;/, 'Die Runtime-API stellt weiterhin die Legacy-Schmiedeaktualisierung bereit.');
assert.doesNotMatch(runtimeService, /runtime\.updateForgeJob\(\)/, 'Der Scheduler ruft weiterhin die Legacy-Schmiedeaktualisierung auf.');
assert.doesNotMatch(runtimeService, /\bupdateMarketJob\(\): boolean;/, 'Die Runtime-API stellt weiterhin die Legacy-Marktaktualisierung bereit.');
assert.doesNotMatch(runtimeService, /runtime\.updateMarketJob\(\)/, 'Der Scheduler ruft weiterhin die Legacy-Marktaktualisierung auf.');
assert.doesNotMatch(runtimeService, /\bupdateDungeonAutomation\(\): void;/, 'Die Runtime-API stellt weiterhin die Legacy-Dungeonaktualisierung bereit.');
assert.doesNotMatch(runtimeService, /runtime\.updateDungeonAutomation\(\)/, 'Der Scheduler ruft weiterhin die Legacy-Dungeonaktualisierung auf.');
assert.doesNotMatch(runtimeService, /renderDungeonStatus\(\): void;/, 'Die Runtime-API exportiert weiterhin den Legacy-Dungeonstatus-Renderer.');
assert.doesNotMatch(runtimeService, /renderDungeonLoot\(\): void;/, 'Die Runtime-API exportiert weiterhin den Legacy-Dungeonloot-Renderer.');
assert.doesNotMatch(runtimeService, /renderTeam\(\): void;/, 'Die Runtime-API exportiert weiterhin den Legacy-Dungeonteam-Renderer.');
assert.doesNotMatch(runtimeService, /renderRosterIfIdle/, 'Die Runtime-API exportiert weiterhin den Legacy-Kaderrenderer.');
assert.doesNotMatch(runtimeService, /renderWeaponInventory\(\): void;/, 'Die Runtime-API exportiert weiterhin den Legacy-Waffenlager-Renderer.');
assert.doesNotMatch(runtimeService, /renderForgeJob\(\): void;|runtime\.renderForgeJob\(\)/, 'Die Runtime-API exportiert weiterhin den Legacy-Schmiedeauftragsrenderer.');
assert.doesNotMatch(runtimeService, /renderForgePreview\(\): void;|runtime\.renderForgePreview\(\)/, 'Die Runtime-API exportiert weiterhin den Legacy-Schmiedevorschau-Renderer.');
assert.doesNotMatch(runtimeService, /refreshGold\(\): void;/, 'Die Runtime-API exportiert weiterhin den Legacy-Gold-Refresh.');
assert.doesNotMatch(runtimeService, /\baddLog\(text: string/, 'Die Runtime-API exportiert weiterhin den Legacy-Kampfprotokoll-Callback.');
assert.doesNotMatch(runtimeService, /runtime\.addLog\(/, 'Der Angular-Tick schreibt weiterhin über die Legacy-Runtime ins Kampfprotokoll.');

const orderedRuntimeCalls = [
  'const forgeUpdate = this.gameForge.update();',
  'this.logForgeCompletions(forgeUpdate.completedNames);',
  'const marketUpdate = this.gameMarket.update();',
  'const marketCompleted = marketUpdate.completedCount > 0;',
  'this.logMarketCompletions(marketUpdate.completedSales);',
  'const dungeonUpdate = this.dungeonSession.update();',
  'this.applyDungeonResult(runtime, dungeonUpdate);',
  'this.gameEnergy.update();',
  'this.forgeJobPresentation.render();',
  'runtime.renderMarketJob();',
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
assert.doesNotMatch(tickCycle, /this\.gameDungeon\.update\(\)/, 'Der Tick verarbeitet den Dungeon weiterhin außerhalb des Popup-Session-Gates.');
assert.match(tickCycle, /if \(forgeCompleted\) \{[\s\S]*this\.forgePreviewPresentation\.render\(\);[\s\S]*this\.weaponInventoryPresentation\.render\(\);[\s\S]*\}/, 'Schmiede-Abschluss-Refresh von Angular-Vorschau und Angular-Waffenlager fehlt im Angular-Tick.');
assert.match(tickCycle, /if \(marketCompleted\) \{[\s\S]*runtime\.renderMarketMaterials\(\);[\s\S]*runtime\.renderMarketWeapons\(\);[\s\S]*this\.resourcePresentation\.render\(\);[\s\S]*\}/, 'Markt-Abschluss-Refresh fehlt im Angular-Tick.');
assert.match(runtimeService, /this\.runTickCycle\(\);[\s\S]*this\.scheduleNextTick\(\);/, 'Der 250-ms-Scheduler verwendet nicht den Angular-Tick-Zyklus.');

const angularRegistrationMatch = registrationAdapter.match(/const ANGULAR_RUNTIME_REGISTRATION = `([\s\S]*?)`;/);
assert.ok(angularRegistrationMatch, 'Die Angular-Runtime-Registrierung konnte nicht geprüft werden.');
const angularRegistration = angularRegistrationMatch[1];
for (const forbidden of ['tick:gameTick', 'updateEnergy,', 'updateForgeJob,', 'updateMarketJob,', 'updateDungeonAutomation,', 'renderDungeonStatus,', 'renderDungeonLoot,', 'renderTeam:', '\n  addLog,', 'renderRosterIfIdle:', '\n  renderWeaponInventory,', '\n  renderForgeJob,', '\n  renderForgePreview,', 'refreshGold:']) {
  assert.equal(angularRegistration.includes(forbidden), false, `Legacy-Runtime registriert weiterhin ${forbidden}.`);
}
for (const callback of [
  'renderMarketJob',
  'renderMarketMaterials',
  'renderMarketWeapons',
  'renderInventoryState:',
  'shouldAutoSave:'
]) {
  assert.ok(angularRegistration.includes(callback), `Runtime-Callback für den Angular-Tick fehlt: ${callback}`);
}

const sourceAdapterIndex = appComponent.indexOf('let adaptedScript = this.legacySourceAdapter.adapt(source);');
const tickAdapterIndex = appComponent.indexOf('adaptedScript = this.legacyGameTickAdapter.adapt(adaptedScript);');
const registrationAdapterIndex = appComponent.indexOf('adaptedScript = this.legacyRuntimeRegistrationAdapter.adapt(adaptedScript);');
assert.ok(sourceAdapterIndex >= 0 && tickAdapterIndex > sourceAdapterIndex && registrationAdapterIndex > tickAdapterIndex, 'Die Adapterreihenfolge für den gameTick-Cutover ist nicht stabil.');

console.log('gameTick-Eigentümerschaft: Der zentrale 250-ms-Zyklus liegt in Angular; Dungeon-Fachlogik läuft nur durch die geöffnete Popup-Sitzung und besitzt keinen Offline-Catch-up.');
