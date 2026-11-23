import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import ts from 'typescript';
import { createInitialCityLayout } from '../src/app/game/city-layout-core.ts';
import { createTeam } from '../src/app/game/team-core.ts';

const appComponent = readFileSync('src/app/app.component.ts', 'utf8');
const progressionService = readFileSync('src/app/core/game-progression.service.ts', 'utf8');
const tavernPresentationService = readFileSync('src/app/core/game-tavern-presentation.service.ts', 'utf8');
const progressionPresentationService = readFileSync('src/app/core/game-progression-presentation.service.ts', 'utf8');
const progressionAdapter = readFileSync('src/app/core/legacy-progression-adapter.service.ts', 'utf8');
const progressionPresentationAdapter = readFileSync('src/app/core/legacy-progression-presentation-adapter.service.ts', 'utf8');

assert.match(progressionService, /constructor\(private readonly gameState: GameStateService\)/);
assert.match(progressionService, /spendRecruitCost\(state, applicant\.classId\)/);
assert.match(progressionService, /const id = state\.nextCharacterId\+\+;/);
assert.match(progressionService, /createCharacter\([\s\S]*state\.characters\.push\(character\);/);
assert.match(progressionService, /return buyUpgrade\(this\.state\(\), kind\);/);
assert.match(progressionService, /window\.NoBrainerProgressionCompatibility = \{/);
assert.match(progressionService, /delete window\.NoBrainerProgressionCompatibility;/);

assert.match(tavernPresentationService, /this\.gameProgression\.recruitApplicant\(applicantId\)/, 'Die aktive Rekrutierungsaktion liegt nicht direkt im Angular-Präsentationspfad.');
assert.doesNotMatch(tavernPresentationService, /recruitCharacter\(/, 'Aktive Rekrutierung delegiert noch an die Legacy-Funktion.');
assert.match(progressionAdapter, /replaceOnce\(source, RECRUIT_BLOCK, '', 'Rekrutierungsablauf'\)/, 'Der Legacy-Rekrutierungsablauf wird nicht entfernt.');
assert.doesNotMatch(progressionAdapter, /RECRUIT_BRIDGE|progressionCompatibility\.recruit\(classId\)|result\.character\.name/, 'Legacy besitzt weiterhin den aktiven Rekrutierungsaktionspfad.');
assert.match(progressionAdapter, /progressionCompatibility\.buyUpgrade\(kind\)/, 'Der noch nicht migrierte Ausbaukauf muss weiterhin kontrolliert über die Progression-Kompatibilität laufen.');

assert.match(progressionPresentationService, /gameProgression\.getUpgradeOffer\('inn'\)/);
assert.doesNotMatch(progressionPresentationAdapter, /NoBrainerProgressionCore|NoBrainerProgressionPresentationCore|progressionCompatibility\.getUpgradeOffer/);
assert.match(progressionPresentationAdapter, /progressionPresentation\.render\(\);/);

const bridgeOpen = appComponent.indexOf('this.gameProgression.openLegacyCompatibilityBridge();');
const presentationBridgeOpen = appComponent.indexOf('this.gameProgressionPresentation.openLegacyCompatibilityBridge();');
const stateBootstrap = appComponent.indexOf('this.gameState.openBootstrapRegistration();');
assert.ok(bridgeOpen >= 0 && presentationBridgeOpen > bridgeOpen && stateBootstrap > presentationBridgeOpen, 'Progression-Domain- und Präsentationsbrücke müssen vor dem State-/Legacy-Bootstrap geöffnet werden.');
assert.match(appComponent, /ngOnDestroy\(\): void \{[\s\S]*this\.gameProgressionPresentation\.closeLegacyCompatibilityBridge\(\);[\s\S]*this\.gameProgression\.closeLegacyCompatibilityBridge\(\);/);
assert.match(appComponent, /const APP_VERSION = APP_UI_VERSION;/);

const serviceUrl = new URL('../src/app/core/game-progression.service.ts', import.meta.url);
const testSource = progressionService
  .replace("import { Injectable } from '@angular/core';", '')
  .replace("@Injectable({ providedIn: 'root' })", '')
  .replace(/from '(\.\.?\/[^']+)';/g, (_, path) =>
    `from '${new URL(path.endsWith('.ts') ? path : path + '.ts', serviceUrl).href}';`);
const compiled = ts.transpileModule(testSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
}).outputText;
const resolution = registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === './game-core' ? './game-core.ts' : specifier, context);
  }
});
let GameProgressionService;
try {
  ({ GameProgressionService } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`));
} finally {
  resolution.deregister();
}
const team = createTeam(1);
const cityLayout = createInitialCityLayout();
const forge = cityLayout.buildings.find(building => building.buildingTypeId === 'forge');
const state = {
  gold: 5000, cityLayout, teams: { 1: team }, weaponInventory: [{ id: 7 }],
  characters: [{ id: 1 }, { id: 2, equipment: { rightHand: 7, leftHand: null } }]
};
const service = new GameProgressionService({ getState: () => state });
team.dungeonTeamSlots[0] = 2;
team.dungeonAuto = true;
assert.equal(service.dismissCharacter(2), false);
team.dungeonAuto = false;
forge.workerCharacterId = 2;
assert.equal(service.dismissCharacter(2), false);
forge.workerCharacterId = null;
assert.equal(service.dismissCharacter(2), true);
assert.equal(service.dismissCharacter(2), false);
assert.equal(service.dismissCharacter(1), false);
assert.deepEqual(state.characters, [{ id: 1 }]);
assert.deepEqual(team.dungeonTeamSlots, [null, null, null, null]);
assert.deepEqual(state.weaponInventory, [{ id: 7 }]);
assert.equal(state.gold, 5000);

console.log('Progression-Eigentümerschaft: Rekrutierung verändert den Angular-State direkt über GameProgressionService; der berührte Legacy-Rekrutierungspfad ist entfernt, während bestehende Ausbaukäufe kontrolliert kompatibel bleiben.');
