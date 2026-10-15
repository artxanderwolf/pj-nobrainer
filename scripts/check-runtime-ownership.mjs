import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const appComponent = readFileSync('src/app/app.component.ts', 'utf8');
const runtimeService = readFileSync('src/app/core/game-runtime.service.ts', 'utf8');
const gameTickAdapter = readFileSync('src/app/core/legacy-game-tick-adapter.service.ts', 'utf8');
const registrationAdapter = readFileSync('src/app/core/legacy-runtime-registration-adapter.service.ts', 'utf8');

assert.equal(existsSync('src/app/core/legacy-runtime.service.ts'), false, 'Der alte LegacyRuntimeService ist noch vorhanden.');
assert.match(appComponent, /import \{ GameRuntimeService \} from '\.\/core\/game-runtime\.service';/, 'Der App-Component verwendet den Angular-eigenen GameRuntimeService nicht.');
assert.match(appComponent, /private readonly gameRuntime: GameRuntimeService/, 'Der Angular-eigene Runtime-Service ist nicht in den App-Component injiziert.');

const sourceAdapterIndex = appComponent.indexOf('let adaptedScript = this.legacySourceAdapter.adapt(source);');
const gameTickAdapterIndex = appComponent.indexOf('adaptedScript = this.legacyGameTickAdapter.adapt(adaptedScript);');
const registrationAdapterIndex = appComponent.indexOf('adaptedScript = this.legacyRuntimeRegistrationAdapter.adapt(adaptedScript);');
assert.ok(sourceAdapterIndex >= 0, 'Der Legacy-Source-Adapter-Aufruf fehlt.');
assert.ok(gameTickAdapterIndex > sourceAdapterIndex, 'Der Legacy-gameTick muss nach dem Source-Adapter entfernt werden.');
assert.ok(registrationAdapterIndex > gameTickAdapterIndex, 'Die Runtime-Registrierung muss nach dem gameTick-Cutover auf Angular-Eigentümerschaft umgestellt werden.');

const openBootstrapIndex = appComponent.indexOf('this.gameRuntime.openBootstrapRegistration();');
const installScriptIndex = appComponent.indexOf('this.installLegacyScript(adaptedScript);');
const closeBootstrapIndex = appComponent.indexOf('this.gameRuntime.closeBootstrapRegistration();');
assert.ok(openBootstrapIndex >= 0, 'Der temporäre Runtime-Bootstrap wird nicht geöffnet.');
assert.ok(installScriptIndex > openBootstrapIndex, 'Das Runtime-Script wird vor dem Angular-Bootstrap installiert.');
assert.ok(closeBootstrapIndex > installScriptIndex, 'Der temporäre Runtime-Bootstrap wird nach der Script-Installation nicht wieder geschlossen.');
assert.match(appComponent, /const APP_VERSION = '0\.12\.69';/, 'Die App-Version wurde nicht auf v0.12.69 gesetzt.');

assert.match(runtimeService, /private runtime: GameRuntimeApi \| null = null;/, 'Die Runtime-Instanz liegt nicht im Angular-Service.');
assert.match(runtimeService, /window\.NoBrainerRuntimeBootstrap = \{/, 'Der temporäre Runtime-Bootstrap wird nicht durch Angular bereitgestellt.');
assert.match(runtimeService, /delete window\.NoBrainerRuntimeBootstrap;/, 'Der temporäre Runtime-Bootstrap wird nach der Registrierung nicht entfernt.');
assert.match(runtimeService, /this\.runtime = runtime;/, 'Die registrierte Runtime wird nicht im Angular-Service gespeichert.');
assert.doesNotMatch(runtimeService, /NoBrainerLegacyRuntime/, 'Der Angular-Runtime-Service greift weiterhin auf window.NoBrainerLegacyRuntime zu.');
assert.match(gameTickAdapter, /const LEGACY_GAME_TICK_BLOCK = `function gameTick\(\)\{/, 'Der gameTick-Cutover besitzt keinen eindeutigen Legacy-Anker.');
assert.match(registrationAdapter, /const runtimeBootstrap=window\.NoBrainerRuntimeBootstrap;/, 'Der Runtime-Registrierungsadapter verwendet den Angular-Bootstrap nicht.');
assert.match(registrationAdapter, /runtimeBootstrap\.register\(\{/, 'Die Legacy-Runtime wird nicht an Angular übergeben.');
assert.match(registrationAdapter, /window\.NoBrainerLegacyRuntime=\{/, 'Der Adapter besitzt nicht mehr den erwarteten alten Registrierungsanker.');

console.log('Runtime-Eigentümerschaft: Runtime-Instanz und zentraler Tick-Lebenszyklus liegen in Angular; globale Legacy-Runtime und Legacy-gameTick sind aus dem laufenden Pfad entfernt.');
