import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appComponent = readFileSync('src/app/app.component.ts', 'utf8');
const forgeService = readFileSync('src/app/core/game-forge.service.ts', 'utf8');
const runtimeService = readFileSync('src/app/core/game-runtime.service.ts', 'utf8');
const forgeAdapter = readFileSync('src/app/core/legacy-forge-adapter.service.ts', 'utf8');
const registrationAdapter = readFileSync('src/app/core/legacy-runtime-registration-adapter.service.ts', 'utf8');

assert.match(forgeService, /constructor\(private readonly gameState: GameStateService\)/, 'Der Angular-Schmiede-Service verwendet den Angular-State nicht.');
assert.match(forgeService, /forgeRequirements\(slots\)/, 'Materialbedarf läuft nicht über den bestehenden Forge-Core.');
assert.match(forgeService, /reserveForgeMaterials\(state\.inventory, requirements\)/, 'Materialreservierung liegt nicht im Angular-Schmiede-Service.');
assert.match(forgeService, /enqueueForgeJob\(state, job, activeSlots, queueSlots, at\)/, 'Auftragsstart und Queue laufen nicht über den Forge-Core.');
assert.match(forgeService, /advanceForgeJobs\(state, activeSlots, now/, 'Schmiede-Timeline läuft nicht über den Angular-Schmiede-Service.');
assert.match(forgeService, /state\.weaponInventory\.unshift\(\{/, 'Fertige Waffen werden nicht durch den Angular-Schmiede-Service ins Inventar übernommen.');
assert.match(forgeService, /window\.NoBrainerForgeCompatibility = \{/, 'Die kontrollierte Schmiede-Kompatibilitätsbrücke fehlt.');
assert.match(forgeService, /delete window\.NoBrainerForgeCompatibility;/, 'Die Schmiede-Kompatibilitätsbrücke kann nicht entfernt werden.');

assert.match(runtimeService, /private readonly gameForge: GameForgeService/, 'GameRuntimeService besitzt keinen Angular-Schmiede-Service.');
assert.match(runtimeService, /private runTickCycle\(\): void \{[\s\S]*const forgeUpdate = this\.gameForge\.update\(\);/, 'Der Angular-Tick aktualisiert die Schmiede nicht direkt.');
assert.match(runtimeService, /runtime\.prepare\(\);[\s\S]*this\.gameEnergy\.update\(\);[\s\S]*const forgeUpdate = this\.gameForge\.update\(\);[\s\S]*const marketUpdate = this\.gameMarket\.update\(\);[\s\S]*const dungeonUpdate = this\.gameDungeon\.update\(\);[\s\S]*this\.gameEnergy\.update\(\);/, 'Die Startreihenfolge Energie → Schmiede → Markt → Dungeon → Energie wurde nicht erhalten.');
assert.doesNotMatch(runtimeService, /\bupdateForgeJob\(\): boolean;/, 'GameRuntimeApi enthält weiterhin einen Legacy-Schmiede-Callback.');
assert.doesNotMatch(runtimeService, /runtime\.updateForgeJob\(\)/, 'GameRuntimeService ruft weiterhin updateForgeJob aus der Legacy-Runtime auf.');
assert.match(runtimeService, /runtime\.addLog\(`Schmiede fertig: \$\{name\} wurde dem Waffeninventar hinzugefügt\.`/, 'Schmiede-Abschlussmeldungen gehen beim Angular-Cutover verloren.');

assert.doesNotMatch(forgeAdapter, /FORGE_CORE_BRIDGE|NoBrainerForgeCore/, 'Der Legacy-Schmiede-Adapter registriert weiterhin den Forge-Core selbst global.');
assert.match(forgeAdapter, /forgeCompatibility\.requirements\(slots\)/, 'Legacy-Materialbedarf delegiert nicht an Angular.');
assert.match(forgeAdapter, /forgeCompatibility\.preview\(selection\.weaponForm,selection\.slots\)/, 'Legacy-Schmiedevorschau delegiert nicht an Angular.');
assert.match(forgeAdapter, /forgeCompatibility\.start\(preview\.weaponForm,finalName,preview\.slots,Date\.now\(\)\)/, 'Legacy-Schmiedestart delegiert nicht an Angular.');
assert.match(forgeAdapter, /this\.replaceRange\(adapted, 'function finishForgeJob\(', 'function renderForgeJob\(\)\{', '', 'Schmiede-Fortschritt'\)/, 'Legacy-Fertigstellung und updateForgeJob werden nicht aus dem laufenden Script entfernt.');

const registrationMatch = registrationAdapter.match(/const ANGULAR_RUNTIME_REGISTRATION = `([\s\S]*?)`;/);
assert.ok(registrationMatch, 'Die Angular-Runtime-Registrierung konnte nicht gelesen werden.');
assert.doesNotMatch(registrationMatch[1], /\n  updateForgeJob,/, 'Die Legacy-Runtime exportiert weiterhin updateForgeJob.');
assert.match(registrationMatch[1], /function prepareGameRuntime\(\)\{\n  loadGame\(\);\n\}/, 'Der Runtime-Prepare-Callback enthält weiterhin Fachupdates, die Angular orchestrieren soll.');
assert.match(registrationMatch[1], /\n  addLog,/, 'Die generische Log-Präsentationsbrücke für Angular-Fachservices fehlt.');

const openEnergyIndex = appComponent.indexOf('this.gameEnergy.openLegacyCompatibilityBridge();');
const openForgeIndex = appComponent.indexOf('this.gameForge.openLegacyCompatibilityBridge();');
const openStateIndex = appComponent.indexOf('this.gameState.openBootstrapRegistration();');
assert.ok(openEnergyIndex >= 0 && openForgeIndex > openEnergyIndex && openStateIndex > openForgeIndex, 'Die Schmiede-Kompatibilitätsbrücke wird nicht vor State- und Runtime-Bootstrap geöffnet.');
assert.match(appComponent, /ngOnDestroy\(\): void \{[\s\S]*this\.gameForge\.closeLegacyCompatibilityBridge\(\);/, 'Die Schmiede-Kompatibilitätsbrücke wird beim App-Abbau nicht geschlossen.');
assert.match(appComponent, /const APP_VERSION = '0\.12\.67';/, 'Die App-Version wurde nicht auf v0.12.67 gesetzt.');

console.log('Schmiede-Eigentümerschaft: Auftragserstellung, Materialien, Slots, Queue, Fortschritt und Fertigstellung laufen auf Angular-State im GameForgeService; Legacy-Code enthält nur noch UI-Kompatibilitätswrapper.');
