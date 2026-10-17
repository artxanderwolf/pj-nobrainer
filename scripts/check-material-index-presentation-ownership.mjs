import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/app/app.component.ts', 'utf8');
const service = readFileSync('src/app/core/game-material-index-presentation.service.ts', 'utf8');
const adapter = readFileSync('src/app/core/legacy-material-presentation-adapter.service.ts', 'utf8');

assert.match(service, /Object\.entries\(MATERIALS\)/, 'Materialindex liest nicht aus den gemeinsamen Materialdefinitionen.');
assert.match(service, /getMaterialIndexRowPresentation\(/, 'Materialindex verwendet den bestehenden Presentation-Core nicht.');
assert.match(service, /reinforcementEffectText\(name\)/, 'Materialindex verwendet den bestehenden Verstärkungstext nicht.');
assert.match(service, /getDungeonMaterialDropWeight\(1, name\)/, 'Materialindex übernimmt nicht die aktuellen Dungeon-Gewichte aus den gemeinsamen Definitionen.');
assert.doesNotMatch(service, /DUNGEON_LOOT_TABLES|category\.items\.find/, 'Materialindex hängt weiterhin an der alten globalen Dungeon-Loot-Tabelle.');
assert.match(service, /document\.getElementById\('materialIndexRows'\)/);
assert.match(service, /materialIndexPresentationOwner'\] = 'angular'/, 'Browser-nachweisbarer Angular-Ownership-Marker fehlt.');
assert.match(service, /applyMobileLabels\(body, row\)/, 'Mobile Tabellenlabels werden beim Angular-Render nicht erhalten.');
assert.match(service, /window\.NoBrainerMaterialIndexPresentationCompatibility = \{ render: \(\) => this\.render\(\) \};/);
assert.match(service, /delete window\.NoBrainerMaterialIndexPresentationCompatibility;/);

const indexBridge = adapter.match(/const MATERIAL_INDEX_BRIDGE = `([\s\S]*?)`;/);
assert.ok(indexBridge, 'Materialindex-Kompatibilitätswrapper konnte nicht gelesen werden.');
assert.match(indexBridge[1], /NoBrainerMaterialIndexPresentationCompatibility/);
assert.match(indexBridge[1], /presentation\.render\(\)/);
assert.doesNotMatch(indexBridge[1], /MATERIALS|getMaterialIndexRowPresentation|reinforcementEffectText|getDungeonMaterialChance|document\.getElementById|innerHTML/, 'Legacy-Materialindexwrapper enthält weiterhin Material- oder DOM-Präsentationslogik.');
assert.doesNotMatch(adapter, /MATERIAL_PRESENTATION_CORE_BRIDGE|NoBrainerMaterialPresentationCore|formatMaterialValue|getMaterialIndexRowPresentation/, 'Legacy-Materialadapter besitzt weiterhin den alten Presentation-Core.');
assert.match(adapter, /'function displayVal\('/, 'Der Cutover besitzt keinen stabilen Startanker für die alte Materialindex-Formatierung.');
assert.match(adapter, /'function rarityFactorFromRarity\('/, 'Der Cutover schützt den nachfolgenden Rarity-Helper nicht.');

const bridgeOpen = app.indexOf('this.gameMaterialIndexPresentation.openLegacyCompatibilityBridge();');
const stateBootstrap = app.indexOf('this.gameState.openBootstrapRegistration();');
assert.ok(bridgeOpen >= 0 && stateBootstrap > bridgeOpen, 'Materialindex-Präsentationsbrücke muss vor dem State-/Legacy-Bootstrap geöffnet werden.');
assert.match(app, /private readonly gameMaterialIndexPresentation: GameMaterialIndexPresentationService/);
assert.match(app, /ngOnDestroy\(\): void \{[\s\S]*this\.gameMaterialIndexPresentation\.closeLegacyCompatibilityBridge\(\);/);
assert.match(app, /const APP_VERSION = '0\.12\.86';/);

console.log('Materialindex-Präsentations-Eigentümerschaft: Materialwerte und aktuelle Dungeon-Gewichte werden direkt durch Angular aus den gemeinsamen Definitionen gerendert.');
