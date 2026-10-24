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
assert.match(appComponent, /const APP_VERSION = APP_UI_VERSION;/, 'Die interne App-Version verwendet nicht die gemeinsame sichtbare Versionsquelle.');

assert.match(runtimeService, /private runtime: GameRuntimeApi \| null = null;/, 'Die Runtime-Instanz liegt nicht im Angular-Service.');
assert.match(runtimeService, /window\.NoBrainerRuntimeBootstrap = \{/, 'Der temporäre Runtime-Bootstrap wird nicht durch Angular bereitgestellt.');
assert.match(runtimeService, /delete window\.NoBrainerRuntimeBootstrap;/, 'Der temporäre Runtime-Bootstrap wird nach der Registrierung nicht entfernt.');
assert.match(runtimeService, /this\.runtime = runtime;/, 'Die registrierte Runtime wird nicht im Angular-Service gespeichert.');
assert.doesNotMatch(runtimeService, /NoBrainerLegacyRuntime/, 'Der Angular-Runtime-Service greift weiterhin auf window.NoBrainerLegacyRuntime zu.');
assert.match(runtimeService, /private readonly saveTransfer: GameSaveTransferService/, 'Der JSON-Spielstandtransfer ist nicht Angular-eigen in die Runtime injiziert.');
assert.match(runtimeService, /runtime\.prepare\(\);\n    this\.saveTransfer\.bindActions\(\(\) => runtime\.save\(true\)\);\n    const materialStorageChanged = this\.normalizeMaterialStorage\(\) > 0;/, 'Der Spielstandtransfer verwendet nach dem Legacy-Load nicht denselben Runtime-Save oder verdrängt die Materialnormalisierung.');
assert.match(runtimeService, /const dungeonMaterialReferencesChanged = this\.gameDungeon\.normalizeMaterialReferences\(\) > 0;/, 'Geladene Dungeon-Beute und ausstehende Drops werden nicht auf stabile Material-IDs normalisiert.');
assert.match(runtimeService, /const forgeMaterialReferencesChanged = this\.gameForge\.normalizeMaterialReferences\(\) > 0;/, 'Geladene Schmiedeslots werden nicht auf stabile Material-IDs normalisiert.');
assert.match(runtimeService, /const marketMaterialReferencesChanged = this\.gameMarket\.normalizeMaterialReferences\(\) > 0;/, 'Geladene Marktaufträge werden nicht auf stabile Material-IDs normalisiert.');
assert.match(runtimeService, /materialStorageChanged \|\| dungeonMaterialReferencesChanged \|\| forgeMaterialReferencesChanged \|\| marketMaterialReferencesChanged/, 'Die vollständige Materialreferenz-Migration wird nicht gemeinsam persistiert.');
assert.match(runtimeService, /const dungeonSessionPreparation = this\.dungeonSession\.prepareLoadedSession\(Date\.now\(\)\);/, 'Persistierte Dungeon-Sitzungen werden beim Runtime-Start nicht durch die Resume-Migration vorbereitet.');
assert.match(runtimeService, /else if \(materialReferencesChanged \|\| dungeonSessionPreparation\.saveRequested\) \{\n      runtime\.save\(false\);\n    \}/, 'Materialreferenz-Migration oder Bereinigung eines alten Dungeon-Laufzustands werden nach dem Laden nicht persistent gespeichert.');
assert.match(runtimeService, /if \(inventoryChanged\) \{\n      this\.normalizeMaterialStorage\(\);/, 'Neue Dungeon-Lagerzugänge werden vor Render/Save nicht auf kanonische Material-ID-Schlüssel normalisiert.');
assert.match(runtimeService, /return normalizeMaterialInventory\(inventory\);/, 'Runtime delegiert die Materialnormalisierung nicht an den gemeinsamen Storage-Core.');
assert.match(gameTickAdapter, /const LEGACY_GAME_TICK_BLOCK = `function gameTick\(\)\{/, 'Der gameTick-Cutover besitzt keinen eindeutigen Legacy-Anker.');
assert.match(registrationAdapter, /const runtimeBootstrap=window\.NoBrainerRuntimeBootstrap;/, 'Der Runtime-Registrierungsadapter verwendet den Angular-Bootstrap nicht.');
assert.match(registrationAdapter, /runtimeBootstrap\.register\(\{/, 'Die Legacy-Runtime wird nicht an Angular übergeben.');
assert.match(registrationAdapter, /window\.NoBrainerLegacyRuntime=\{/, 'Der Adapter besitzt nicht mehr den erwarteten alten Registrierungsanker.');

console.log('Runtime-Eigentümerschaft: JSON-Spielstandtransfer nutzt den zentralen Runtime-Save; Lager, Dungeon-Loot, Schmiedeslots und Marktaufträge werden weiter auf kanonische Material-IDs migriert; moderne Dungeon-Sitzungen werden fortgesetzt und Altstände ohne Endzeit bereinigt.');
