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
assert.match(simulatedCutover, /function updateEnergy\(\)/, 'Die Energie-Fachfunktion wurde beim gameTick-Cutover versehentlich entfernt.');
assert.match(simulatedCutover, /function updateForgeJob\(\)/, 'Die Schmiede-Fachfunktion wurde beim gameTick-Cutover versehentlich entfernt.');
assert.match(simulatedCutover, /function updateMarketJob\(\)/, 'Die Markt-Fachfunktion wurde beim gameTick-Cutover versehentlich entfernt.');
assert.match(simulatedCutover, /function updateDungeonAutomation\(\)/, 'Die Dungeon-Fachfunktion wurde beim gameTick-Cutover versehentlich entfernt.');

assert.match(runtimeService, /private runTickCycle\(\): void \{/, 'Der zentrale Angular-Tick-Zyklus fehlt.');
assert.doesNotMatch(runtimeService, /\btick\(\): void;/, 'Die Runtime-API stellt weiterhin den alten Legacy-tick bereit.');
assert.doesNotMatch(runtimeService, /getRuntime\(\)\.tick\(\)/, 'Der Scheduler ruft weiterhin den Legacy-gameTick auf.');

const orderedRuntimeCalls = [
  'runtime.updateEnergy();',
  'const forgeCompleted = runtime.updateForgeJob();',
  'const marketCompleted = runtime.updateMarketJob();',
  'runtime.updateDungeonAutomation();',
  'runtime.renderForgeJob();',
  'runtime.renderMarketJob();',
  'runtime.renderDungeonStatus();',
  'runtime.renderDungeonLoot();',
  'runtime.renderTeam();',
  'runtime.renderRosterIfIdle();',
  'if (runtime.shouldAutoSave(Date.now())) runtime.save(false);'
];
let previousIndex = -1;
for (const call of orderedRuntimeCalls) {
  const index = runtimeService.indexOf(call);
  assert.ok(index > previousIndex, `Angular-gameTick-Reihenfolge ist ungültig oder Aufruf fehlt: ${call}`);
  previousIndex = index;
}
assert.match(runtimeService, /if \(forgeCompleted\) \{[\s\S]*runtime\.renderForgePreview\(\);[\s\S]*runtime\.renderWeaponInventory\(\);[\s\S]*\}/, 'Schmiede-Abschluss-Refresh fehlt im Angular-Tick.');
assert.match(runtimeService, /if \(marketCompleted\) \{[\s\S]*runtime\.renderMarketMaterials\(\);[\s\S]*runtime\.renderMarketWeapons\(\);[\s\S]*runtime\.refreshGold\(\);[\s\S]*\}/, 'Markt-Abschluss-Refresh fehlt im Angular-Tick.');
assert.match(runtimeService, /this\.runTickCycle\(\);[\s\S]*this\.scheduleNextTick\(\);/, 'Der 250-ms-Scheduler verwendet nicht den Angular-Tick-Zyklus.');

const angularRegistrationMatch = registrationAdapter.match(/const ANGULAR_RUNTIME_REGISTRATION = `([\s\S]*?)`;/);
assert.ok(angularRegistrationMatch, 'Die Angular-Runtime-Registrierung konnte nicht geprüft werden.');
const angularRegistration = angularRegistrationMatch[1];
assert.doesNotMatch(angularRegistration, /tick:gameTick/, 'Die Angular-Runtime registriert weiterhin den Legacy-gameTick.');
for (const callback of [
  'updateEnergy',
  'updateForgeJob',
  'updateMarketJob',
  'updateDungeonAutomation',
  'renderForgeJob',
  'renderMarketJob',
  'renderDungeonStatus',
  'renderDungeonLoot',
  'renderTeam:',
  'renderForgePreview',
  'renderWeaponInventory',
  'renderMarketMaterials',
  'renderMarketWeapons',
  'refreshGold:',
  'renderRosterIfIdle:',
  'shouldAutoSave:'
]) {
  assert.ok(angularRegistration.includes(callback), `Runtime-Callback für den Angular-Tick fehlt: ${callback}`);
}

const sourceAdapterIndex = appComponent.indexOf('let adaptedScript = this.legacySourceAdapter.adapt(source);');
const tickAdapterIndex = appComponent.indexOf('adaptedScript = this.legacyGameTickAdapter.adapt(adaptedScript);');
const registrationAdapterIndex = appComponent.indexOf('adaptedScript = this.legacyRuntimeRegistrationAdapter.adapt(adaptedScript);');
assert.ok(sourceAdapterIndex >= 0 && tickAdapterIndex > sourceAdapterIndex && registrationAdapterIndex > tickAdapterIndex, 'Die Adapterreihenfolge für den gameTick-Cutover ist nicht stabil.');
assert.match(appComponent, /const APP_VERSION = '0\.12\.59';/, 'Die App-Version wurde nicht auf v0.12.59 gesetzt.');

console.log('gameTick-Eigentümerschaft: Der zentrale 250-ms-Zyklus liegt in Angular; der Legacy-gameTick wird vor Script-Installation entfernt und nur Fach-/Renderoperationen werden über die Übergangs-Runtime aufgerufen.');
