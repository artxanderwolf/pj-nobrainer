import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appComponent = readFileSync('src/app/app.component.ts', 'utf8');
const energyService = readFileSync('src/app/core/game-energy.service.ts', 'utf8');
const runtimeService = readFileSync('src/app/core/game-runtime.service.ts', 'utf8');
const energyAdapter = readFileSync('src/app/core/legacy-energy-adapter.service.ts', 'utf8');
const registrationAdapter = readFileSync('src/app/core/legacy-runtime-registration-adapter.service.ts', 'utf8');

assert.match(energyService, /constructor\(private readonly gameState: GameStateService\)/, 'Der Angular-Energie-Service verwendet den Angular-State nicht.');
assert.match(energyService, /updateEnergyState\([\s\S]*this\.gameState\.getState<RuntimeEnergyState>\(\)/, 'Energie-Regeneration läuft nicht über den bestehenden TypeScript-Energy-Core auf dem Angular-State.');
assert.match(energyService, /CHARACTER_CLASSES\[this\.resolveClassId\(character\.classId\)\]/, 'Klassenabhängige Regeneration wird nicht aus dem Angular-Game-Core gelesen.');
assert.match(energyService, /energyCostPerCharacter\(CONFIG\.dungeon\.energyCost, participantCount\)/, 'Dungeon-Energiekosten werden nicht durch den Angular-Energie-Service berechnet.');
assert.match(energyService, /window\.NoBrainerEnergyCompatibility = \{/, 'Die kontrollierte Energie-Kompatibilitätsbrücke fehlt.');
assert.match(energyService, /delete window\.NoBrainerEnergyCompatibility;/, 'Die Energie-Kompatibilitätsbrücke kann nicht wieder entfernt werden.');

assert.match(runtimeService, /private readonly gameEnergy: GameEnergyService/, 'GameRuntimeService besitzt keinen Angular-Energie-Service.');
assert.match(runtimeService, /private runTickCycle\(\): void \{[\s\S]*this\.gameEnergy\.update\(\);/, 'Der Angular-Tick aktualisiert Energie nicht direkt.');
assert.doesNotMatch(runtimeService, /\bupdateEnergy\(\): void;/, 'GameRuntimeApi enthält weiterhin einen Legacy-Energie-Callback.');
assert.doesNotMatch(runtimeService, /runtime\.updateEnergy\(\)/, 'GameRuntimeService ruft weiterhin Energie über die Legacy-Runtime auf.');

assert.doesNotMatch(energyAdapter, /ENERGY_CORE_BRIDGE/, 'Der Legacy-Energie-Adapter registriert weiterhin den Core selbst global.');
assert.match(energyAdapter, /return energyCompatibility\.update\(\);/, 'Legacy-Aufrufe der Energieaktualisierung werden nicht an Angular weitergereicht.');
assert.match(energyAdapter, /return energyCompatibility\.costPerCharacter\(count\);/, 'Legacy-Dungeon-Energiekosten werden nicht an Angular weitergereicht.');

const registrationMatch = registrationAdapter.match(/const ANGULAR_RUNTIME_REGISTRATION = `([\s\S]*?)`;/);
assert.ok(registrationMatch, 'Die Angular-Runtime-Registrierung konnte nicht gelesen werden.');
assert.doesNotMatch(registrationMatch[1], /\n  updateEnergy,/, 'Die Legacy-Runtime exportiert weiterhin Energie als Runtime-Callback.');

const openBridgeIndex = appComponent.indexOf('this.gameEnergy.openLegacyCompatibilityBridge();');
const openStateIndex = appComponent.indexOf('this.gameState.openBootstrapRegistration();');
assert.ok(openBridgeIndex >= 0 && openStateIndex > openBridgeIndex, 'Die Energie-Kompatibilitätsbrücke wird nicht vor der Legacy-Script-Installation bereitgestellt.');
assert.match(appComponent, /ngOnDestroy\(\): void \{[\s\S]*this\.gameEnergy\.closeLegacyCompatibilityBridge\(\);/, 'Die Energie-Kompatibilitätsbrücke wird beim App-Abbau nicht geschlossen.');
assert.match(appComponent, /const APP_VERSION = '0\.12\.65';/, 'Die App-Version wurde nicht auf v0.12.65 gesetzt.');

console.log('Energie-Eigentümerschaft: Regeneration und Energiekosten liegen im Angular-Service auf dem Angular-State; Legacy-Code besitzt nur noch eine kontrollierte Kompatibilitätsbrücke.');
