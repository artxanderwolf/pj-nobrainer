import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appComponent = readFileSync('src/app/app.component.ts', 'utf8');
const energyService = readFileSync('src/app/core/game-energy.service.ts', 'utf8');
const runtimeService = readFileSync('src/app/core/game-runtime.service.ts', 'utf8');
const energyAdapter = readFileSync('src/app/core/legacy-energy-adapter.service.ts', 'utf8');
const registrationAdapter = readFileSync('src/app/core/legacy-runtime-registration-adapter.service.ts', 'utf8');

assert.match(energyService, /constructor\(private readonly gameState: GameStateService\)/);
assert.match(energyService, /const state = this\.gameState\.getState<RuntimeEnergyState>\(\);/);
assert.match(energyService, /calculateCharacterStats\([\s\S]*character\.classId,[\s\S]*weapons,[\s\S]*characterStatLevelMultiplier\(character\.level\)[\s\S]*\)/);
assert.match(energyService, /character\.maxHp = effective\.maxHp;/);
assert.match(energyService, /character\.maxEnergy = effective\.maxEnergy;/);
assert.match(energyService, /energyRegenPerMinute: effectiveByCharacter\.get\(character\.id\)\?\.energyRegenPerMinute/);
assert.match(energyService, /energyCostPerCharacter\(CONFIG\.dungeon\.energyCost, participantCount\)/);
assert.match(energyService, /window\.NoBrainerEnergyCompatibility = \{/);
assert.match(energyService, /delete window\.NoBrainerEnergyCompatibility;/);

assert.match(runtimeService, /private readonly gameEnergy: GameEnergyService/);
assert.match(runtimeService, /private runTickCycle\(\): void \{[\s\S]*this\.gameEnergy\.update\(\);/);
assert.doesNotMatch(runtimeService, /\bupdateEnergy\(\): void;|runtime\.updateEnergy\(\)/);
assert.doesNotMatch(energyAdapter, /ENERGY_CORE_BRIDGE/);
assert.match(energyAdapter, /return energyCompatibility\.update\(\);/);
assert.match(energyAdapter, /return energyCompatibility\.costPerCharacter\(count\);/);
const registrationMatch = registrationAdapter.match(/const ANGULAR_RUNTIME_REGISTRATION = `([\s\S]*?)`;/);
assert.ok(registrationMatch);
assert.doesNotMatch(registrationMatch[1], /\n  updateEnergy,/);
assert.ok(appComponent.indexOf('this.gameEnergy.openLegacyCompatibilityBridge();') >= 0);
assert.match(appComponent, /ngOnDestroy\(\): void \{[\s\S]*this\.gameEnergy\.closeLegacyCompatibilityBridge\(\);/);
assert.match(appComponent, /const APP_VERSION = '0\.12\.87';/);

console.log('Energie-Eigentümerschaft: Level-/Waffenboni auf HP, E und E-R liegen im Angular-Service; Legacy besitzt nur die kontrollierte Kompatibilitätsbrücke.');
