import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appComponent = readFileSync('src/app/app.component.ts', 'utf8');
const progressionService = readFileSync('src/app/core/game-progression.service.ts', 'utf8');
const tavernPresentationService = readFileSync('src/app/core/game-tavern-presentation.service.ts', 'utf8');
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

assert.match(tavernPresentationService, /this\.gameProgression\.recruit\(classId\)/, 'Die aktive Rekrutierungsaktion liegt nicht direkt im Angular-Präsentationspfad.');
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

console.log('Progression-Eigentümerschaft: Rekrutierung verändert den Angular-State direkt über GameProgressionService; der berührte Legacy-Rekrutierungspfad ist entfernt, während bestehende Ausbaukäufe kontrolliert kompatibel bleiben.');
