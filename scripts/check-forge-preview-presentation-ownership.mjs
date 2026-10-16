import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/app/app.component.ts', 'utf8');
const service = readFileSync('src/app/core/game-forge-preview-presentation.service.ts', 'utf8');
const adapter = readFileSync('src/app/core/legacy-forge-presentation-adapter.service.ts', 'utf8');
const runtime = readFileSync('src/app/core/game-runtime.service.ts', 'utf8');
const registration = readFileSync('src/app/core/legacy-runtime-registration-adapter.service.ts', 'utf8');

assert.match(service, /private readonly gameState: GameStateService/);
assert.match(service, /private readonly gameForge: GameForgeService/);
assert.match(service, /getForgePreviewPresentation\(/, 'Angular-Schmiedevorschau verwendet den bestehenden Presentation-Core nicht.');
assert.match(service, /this\.gameForge\.preview\(weaponForm, this\.getForgeSelection\(\)\)/, 'Angular-Schmiedevorschau bezieht Waffenwerte nicht über GameForgeService.');
assert.match(service, /this\.gameForge\.requirements\(preview\.slots\)/, 'Angular-Schmiedevorschau verwendet nicht den bestehenden Materialbedarf.');
assert.match(service, /this\.gameForge\.hasMaterials\(requirements\)/, 'Angular-Schmiedevorschau prüft Materialverfügbarkeit nicht über GameForgeService.');
assert.match(service, /Object\.entries\(MATERIALS\)/, 'Angular-Schmiedevorschau baut die Materialauswahl nicht aus der gemeinsamen Materialdefinition.');
assert.match(service, /reinforcementEffectText\(name\)/, 'Verstärkungseffekt fehlt in der Angular-Materialauswahl.');
for (const id of [
  'forgeTimePreview', 'forgeValuePreview', 'forgeDamagePreview', 'forgeDamageBaseInfo',
  'forgeSpeedPreview', 'forgeSpeedBaseInfo', 'forgeHitPreview', 'forgeRawPreview',
  'forgePenPreview', 'forgeRarityPreview', 'forgeReinforcementPreview'
]) {
  assert.match(service, new RegExp(`'${id}'`), `Angular-Schmiedevorschau rendert ${id} nicht.`);
}
assert.match(service, /startButton\.dataset\['forgePreviewPresentationOwner'\] = 'angular'/, 'Browser-nachweisbarer Angular-Ownership-Marker fehlt.');
assert.match(service, /window\.NoBrainerForgePreviewPresentationCompatibility = \{ render: \(\) => this\.render\(\) \};/);
assert.match(service, /delete window\.NoBrainerForgePreviewPresentationCompatibility;/);

assert.match(adapter, /window\.NoBrainerForgePreviewPresentationCompatibility/);
assert.match(adapter, /forgePreviewPresentation\.render\(\);/);
assert.doesNotMatch(adapter, /NoBrainerForgePresentationCore|FORGE_PRESENTATION_CORE_BRIDGE|getForgePreviewPresentation|populateForgeSelects\(\);|state\.forgeJobs|state\.forgeQueue/, 'Legacy-Schmiedevorschau enthält weiterhin Presentation-Core-, State- oder DOM-Aufbereitungslogik.');
assert.match(adapter, /'function getMaterialsForCategories\('/, 'Cutover besitzt keinen stabilen Startanker für die alte Materialauswahl.');
assert.match(adapter, /'function getForgeSelection\(\)\{'/, 'Cutover schützt die weiterhin für den Startpfad benötigte Legacy-Auswahllesefunktion nicht.');

assert.match(runtime, /private readonly forgePreviewPresentation: GameForgePreviewPresentationService/);
assert.match(runtime, /renderInitial\(\): void \{[\s\S]*this\.forgePreviewPresentation\.render\(\);/, 'Initialer Angular-Render enthält die Schmiedevorschau nicht.');
assert.match(runtime, /if \(forgeCompleted\) \{[\s\S]*this\.forgePreviewPresentation\.render\(\);[\s\S]*this\.weaponInventoryPresentation\.render\(\);/, 'Schmiedeabschluss aktualisiert Vorschau und Waffenlager nicht gezielt über Angular.');
assert.match(runtime, /if \(inventoryChanged\) \{[\s\S]*this\.resourcePresentation\.render\(\);[\s\S]*this\.forgePreviewPresentation\.render\(\);[\s\S]*runtime\.renderInventoryState\(\);/, 'Dungeon-Inventaränderungen aktualisieren die Angular-Schmiedevorschau nicht.');
assert.doesNotMatch(runtime, /renderForgePreview\(\): void;|runtime\.renderForgePreview\(\)/, 'GameRuntimeApi besitzt weiterhin den Legacy-Schmiedevorschau-Callback.');

const registrationMatch = registration.match(/const ANGULAR_RUNTIME_REGISTRATION = `([\s\S]*?)`;/);
assert.ok(registrationMatch, 'Angular-Runtime-Registrierung konnte nicht gelesen werden.');
assert.doesNotMatch(registrationMatch[1], /renderForgePreview/, 'Legacy-Runtime-Registrierung exportiert oder ruft weiterhin renderForgePreview auf.');
assert.match(registrationMatch[1], /renderInventoryState:\(\)=>\{[\s\S]*renderMaterialStorage\(\);[\s\S]*renderMarketMaterials\(\);[\s\S]*\}/, 'Gezielter Legacy-Inventar-Refresh verliert Materiallager oder Markt.');

const characterCutover = app.indexOf('adaptedScript = this.legacyCharacterPresentationAdapter.adapt(adaptedScript);');
const forgePreviewCutover = app.indexOf('adaptedScript = this.legacyForgePresentationAdapter.adapt(adaptedScript);');
assert.ok(characterCutover >= 0 && forgePreviewCutover > characterCutover, 'Der Character-Cutover muss seinen getMaterialsForCategories-Endanker verarbeiten, bevor der Forge-Cutover diesen alten Helper entfernt.');
const bridgeOpen = app.indexOf('this.gameForgePreviewPresentation.openLegacyCompatibilityBridge();');
const stateBootstrap = app.indexOf('this.gameState.openBootstrapRegistration();');
assert.ok(bridgeOpen >= 0 && stateBootstrap > bridgeOpen, 'Schmiedevorschau-Präsentationsbrücke muss vor dem State-/Legacy-Bootstrap geöffnet werden.');
assert.match(app, /private readonly gameForgePreviewPresentation: GameForgePreviewPresentationService/);
assert.match(app, /ngOnDestroy\(\): void \{[\s\S]*this\.gameForgePreviewPresentation\.closeLegacyCompatibilityBridge\(\);/);
assert.match(app, /const APP_VERSION = '0\.12\.82';/);

console.log('Forge-Preview-Presentation-Eigentümerschaft: Materialauswahl, Vorschauwerte und Startbutton-Zustand werden direkt durch Angular aus Angular-State und GameForgeService gerendert; Legacy delegiert nur noch den Renderaufruf und die Adapterreihenfolge schützt bestehende Legacy-Anker.');
