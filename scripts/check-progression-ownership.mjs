import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appComponent = readFileSync('src/app/app.component.ts', 'utf8');
const progressionService = readFileSync('src/app/core/game-progression.service.ts', 'utf8');
const progressionPresentationService = readFileSync('src/app/core/game-progression-presentation.service.ts', 'utf8');
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

assert.match(progressionPresentationService, /gameProgression\.getUpgradeOffer\('inn'\)/);
assert.doesNotMatch(progressionPresentationAdapter, /NoBrainerProgressionCore|NoBrainerProgressionPresentationCore|progressionCompatibility\.getUpgradeOffer/);
assert.match(progressionPresentationAdapter, /progressionPresentation\.render\(\);/);

const bridgeOpen = appComponent.indexOf('this.gameProgression.openLegacyCompatibilityBridge();');
const presentationBridgeOpen = appComponent.indexOf('this.gameProgressionPresentation.openLegacyCompatibilityBridge();');
const stateBootstrap = appComponent.indexOf('this.gameState.openBootstrapRegistration();');
assert.ok(bridgeOpen >= 0 && presentationBridgeOpen > bridgeOpen && stateBootstrap > presentationBridgeOpen, 'Progression-Domain- und Präsentationsbrücke müssen vor dem State-/Legacy-Bootstrap geöffnet werden.');
assert.match(appComponent, /ngOnDestroy\(\): void \{[\s\S]*this\.gameProgressionPresentation\.closeLegacyCompatibilityBridge\(\);[\s\S]*this\.gameProgression\.closeLegacyCompatibilityBridge\(\);/);
assert.match(appComponent, /const APP_VERSION = '0\.12\.88';/);

console.log('Progression-Eigentümerschaft: Rekrutierung und Ausbaukäufe verändern den Angular-State im GameProgressionService; Ausbaukarten lesen Angebote direkt in Angular, Legacy delegiert nur noch UI-Aktionen.');
