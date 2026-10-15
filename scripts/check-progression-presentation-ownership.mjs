import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/app/app.component.ts', 'utf8');
const service = readFileSync('src/app/core/game-progression-presentation.service.ts', 'utf8');
const adapter = readFileSync('src/app/core/legacy-progression-presentation-adapter.service.ts', 'utf8');

assert.match(service, /constructor\([\s\S]*private readonly gameState: GameStateService,[\s\S]*private readonly gameProgression: GameProgressionService/);
assert.match(service, /getUpgradeCardsPresentation\(/, 'Angular-Progressionspräsentation verwendet den bestehenden Presentation-Core nicht.');
for (const kind of ['inn', 'forgeSlots', 'forgeQueue', 'marketSlots', 'marketQueue']) {
  assert.match(service, new RegExp(`gameProgression\\.getUpgradeOffer\\('${kind}'\\)`), `Upgrade-Angebot ${kind} wird nicht über GameProgressionService bezogen.`);
}
for (const id of ['innUpgradeCard', 'forgeUpgradeCard', 'marketUpgradeCard']) {
  assert.match(service, new RegExp(`document\\.getElementById\\('${id}'\\)`), `Angular-Progressionspräsentation rendert ${id} nicht.`);
}
assert.match(service, /state\.characters\.length/);
assert.match(service, /state\.forgeJobs\.length/);
assert.match(service, /state\.forgeQueue\.length/);
assert.match(service, /state\.marketJobs\.length/);
assert.match(service, /state\.marketQueue\.length/);
assert.match(service, /onclick="buyUpgrade\('\$\{button\.kind\}'\)"/, 'Bestehende Upgrade-Aktion wird im Angular-Renderer nicht beibehalten.');
assert.match(service, /progressionPresentationOwner'\] = 'angular'/, 'Browser-nachweisbarer Angular-Ownership-Marker fehlt.');
assert.match(service, /window\.NoBrainerProgressionPresentationCompatibility = \{ render: \(\) => this\.render\(\) \};/);
assert.match(service, /delete window\.NoBrainerProgressionPresentationCompatibility;/);

assert.match(adapter, /window\.NoBrainerProgressionPresentationCompatibility/);
assert.match(adapter, /progressionPresentation\.render\(\);/);
assert.doesNotMatch(adapter, /NoBrainerProgressionPresentationCore|PROGRESSION_PRESENTATION_CORE_BRIDGE|getUpgradeCardsPresentation|state\.characters|state\.upgrades|formatCurrencyNickel/, 'Legacy-Progressionsadapter enthält weiterhin Präsentations- oder State-Logik.');

const bridgeOpen = app.indexOf('this.gameProgressionPresentation.openLegacyCompatibilityBridge();');
const stateBootstrap = app.indexOf('this.gameState.openBootstrapRegistration();');
assert.ok(bridgeOpen >= 0 && stateBootstrap > bridgeOpen, 'Progressions-Präsentationsbrücke muss vor dem State-/Legacy-Bootstrap geöffnet werden.');
assert.match(app, /private readonly gameProgressionPresentation: GameProgressionPresentationService/);
assert.match(app, /ngOnDestroy\(\): void \{[\s\S]*this\.gameProgressionPresentation\.closeLegacyCompatibilityBridge\(\);/);
assert.match(app, /const APP_VERSION = '0\.12\.77';/);

console.log('Progression-Presentation-Eigentümerschaft: Inn-, Schmiede- und Markt-Ausbaukarten werden direkt durch Angular aus Angular-State und GameProgressionService gerendert; Legacy besitzt nur noch einen dünnen Renderwrapper.');
