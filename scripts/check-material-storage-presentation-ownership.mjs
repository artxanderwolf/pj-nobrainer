import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/app/app.component.ts', 'utf8');
const service = readFileSync('src/app/core/game-material-storage-presentation.service.ts', 'utf8');
const adapter = readFileSync('src/app/core/legacy-material-presentation-adapter.service.ts', 'utf8');

assert.match(service, /constructor\(private readonly gameState: GameStateService\)/, 'Materiallager-Präsentation liest nicht aus dem Angular-State.');
assert.match(service, /sortMaterialStorageEntries\(Object\.entries\(this\.state\(\)\.inventory\)\)/, 'Materiallager-Präsentation verwendet die bestehende Sortierung nicht.');
assert.match(service, /materialSellData\(name\)/, 'Materiallager-Präsentation verwendet nicht die bestehenden Verkaufswerte.');
assert.match(service, /getMaterialStorageRowPresentation\(/, 'Materiallager-Präsentation verwendet den bestehenden Presentation-Core nicht.');
assert.match(service, /document\.getElementById\('inventoryRows'\)/);
assert.match(service, /document\.getElementById\('inventoryEmpty'\)/);
assert.match(service, /materialStoragePresentationOwner'\] = 'angular'/, 'Browser-nachweisbarer Angular-Ownership-Marker fehlt.');
assert.match(service, /window\.NoBrainerMaterialStoragePresentationCompatibility = \{ render: \(\) => this\.render\(\) \};/);
assert.match(service, /delete window\.NoBrainerMaterialStoragePresentationCompatibility;/);
assert.match(service, /applyMobileLabels\(body, row\)/, 'Mobile Tabellenlabels werden beim Angular-Render nicht erhalten.');

const storageBridge = adapter.match(/const MATERIAL_STORAGE_BRIDGE = `([\s\S]*?)`;/);
assert.ok(storageBridge, 'Materiallager-Kompatibilitätswrapper konnte nicht gelesen werden.');
assert.match(storageBridge[1], /NoBrainerMaterialStoragePresentationCompatibility/);
assert.match(storageBridge[1], /presentation\.render\(\)/);
assert.doesNotMatch(storageBridge[1], /state\.inventory|materialSellData|getMaterialStorageRowPresentation|sortMaterialStorageEntries|document\.getElementById/, 'Legacy-Materiallagerwrapper enthält weiterhin State- oder DOM-Präsentationslogik.');

const indexBridge = adapter.match(/const MATERIAL_INDEX_BRIDGE = `([\s\S]*?)`;/);
assert.ok(indexBridge, 'Materialindex-Kompatibilitätswrapper fehlt.');
assert.match(indexBridge[1], /NoBrainerMaterialIndexPresentationCompatibility/);
assert.match(indexBridge[1], /presentation\.render\(\)/);
assert.doesNotMatch(adapter, /MATERIAL_PRESENTATION_CORE_BRIDGE|NoBrainerMaterialPresentationCore/, 'Legacy-Materialadapter registriert weiterhin den alten Material-Presentation-Core.');

const bridgeOpen = app.indexOf('this.gameMaterialStoragePresentation.openLegacyCompatibilityBridge();');
const stateBootstrap = app.indexOf('this.gameState.openBootstrapRegistration();');
assert.ok(bridgeOpen >= 0 && stateBootstrap > bridgeOpen, 'Materiallager-Präsentationsbrücke muss vor dem State-/Legacy-Bootstrap geöffnet werden.');
assert.match(app, /private readonly gameMaterialStoragePresentation: GameMaterialStoragePresentationService/);
assert.match(app, /ngOnDestroy\(\): void \{[\s\S]*this\.gameMaterialStoragePresentation\.closeLegacyCompatibilityBridge\(\);/);
assert.match(app, /const APP_VERSION = '0\.12\.90';/);

console.log('Materiallager-Präsentations-Eigentümerschaft: Lagerzeilen und Leerzustand werden direkt durch Angular aus dem Angular-State gerendert; der Legacy-Materialadapter enthält nur noch dünne Renderdelegationen.');
