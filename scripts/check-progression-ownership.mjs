import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appComponent = readFileSync('src/app/app.component.ts', 'utf8');
const progressionService = readFileSync('src/app/core/game-progression.service.ts', 'utf8');
const progressionAdapter = readFileSync('src/app/core/legacy-progression-adapter.service.ts', 'utf8');
const progressionPresentationAdapter = readFileSync('src/app/core/legacy-progression-presentation-adapter.service.ts', 'utf8');

assert.match(progressionService, /constructor\(private readonly gameState: GameStateService\)/);
assert.match(progressionService, /spendRecruitCost\(state, classId\)/);
assert.match(progressionService, /const id = state\.nextCharacterId\+\+;/);
assert.match(progressionService, /createCharacter\([\s\S]*state\.characters\.push\(character\);/);
assert.match(progressionService, /return buyUpgrade\(this\.state\(\), kind\);/);
assert.match(progressionService, /window\.NoBrainerProgressionCompatibility = \{/);
assert.match(progressionService, /delete window\.NoBrainerProgressionCompatibility;/);

assert.doesNotMatch(progressionAdapter, /PROGRESSION_CORE_BRIDGE|NoBrainerProgressionCore/);
assert.match(progressionAdapter, /progressionCompatibility\.recruit\(classId\)/);
assert.match(progressionAdapter, /progressionCompatibility\.buyUpgrade\(kind\)/);
assert.match(progressionAdapter, /result\.character\.name/);

assert.match(progressionPresentationAdapter, /progressionCompatibility\.getUpgradeOffer\("inn"\)/);
assert.doesNotMatch(progressionPresentationAdapter, /NoBrainerProgressionCore/);

const bridgeOpen = appComponent.indexOf('this.gameProgression.openLegacyCompatibilityBridge();');
const stateBootstrap = appComponent.indexOf('this.gameState.openBootstrapRegistration();');
assert.ok(bridgeOpen >= 0 && stateBootstrap > bridgeOpen, 'Progression-Bridge muss vor dem State-/Legacy-Bootstrap geöffnet werden.');
assert.match(appComponent, /ngOnDestroy\(\): void \{[\s\S]*this\.gameProgression\.closeLegacyCompatibilityBridge\(\);/);
assert.match(appComponent, /const APP_VERSION = '0\.12\.76';/);

console.log('Progression-Eigentümerschaft: Rekrutierung und Ausbaukäufe verändern den Angular-State im GameProgressionService; Legacy-Code delegiert nur noch UI-Aktionen.');
