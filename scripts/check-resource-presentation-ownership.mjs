import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/app/app.component.ts', 'utf8');
const service = readFileSync('src/app/core/game-resource-presentation.service.ts', 'utf8');
const adapter = readFileSync('src/app/core/legacy-resource-presentation-adapter.service.ts', 'utf8');
const runtime = readFileSync('src/app/core/game-runtime.service.ts', 'utf8');
const registration = readFileSync('src/app/core/legacy-runtime-registration-adapter.service.ts', 'utf8');

assert.match(service, /private readonly gameState: GameStateService/, 'Ressourcen-Präsentation liest nicht aus dem Angular-State.');
assert.match(service, /private readonly cityOverview: GameCityOverviewPresentationService/, 'Die Angular-Stadtübersicht ist nicht an den zentralen Präsentationsrender angebunden.');
assert.match(service, /this\.cityOverview\.render\(\);/, 'Die Stadtübersicht wird beim zentralen Angular-Präsentationsrender nicht synchronisiert.');
assert.match(service, /getResourceHeaderPresentation\(state\.gold, state\.inventory\)/, 'Ressourcen-Präsentation verwendet den bestehenden Presentation-Core nicht.');
assert.doesNotMatch(service, /formatHighestCurrency/, 'Die Stadtgeld-Kopfzeile darf nicht mehr die globale Economy-Formatierung für die Münzstufe verwenden.');
assert.match(service, /document\.getElementById\('gold'\)/);
assert.match(service, /document\.getElementById\('goldIcon'\)/);
assert.match(service, /document\.getElementById\('matCount'\)/);
assert.match(service, /resourcePresentationOwner'\] = 'angular'/, 'Browser-nachweisbarer Angular-Ownership-Marker fehlt.');
assert.match(service, /currencyDenomination'\] = presentation\.goldDenomination/, 'Die sichtbare Münzstufe wird nicht am Angular-Geldanker markiert.');
assert.match(service, /goldIcon\.setAttribute\('src', presentation\.goldIconSrc\)/, 'Das Münzicon wird nicht durch Angular anhand des Nickelbestands aktualisiert.');
assert.match(service, /window\.NoBrainerResourcePresentationCompatibility = \{ render: \(\) => this\.render\(\) \};/);
assert.match(service, /this\.cityOverview\.destroy\(\);/, 'Die Stadtübersicht räumt ihre Präsentationsbindungen beim App-Abbau nicht auf.');
assert.match(service, /delete window\.NoBrainerResourcePresentationCompatibility;/);

assert.match(adapter, /window\.NoBrainerResourcePresentationCompatibility/);
assert.match(adapter, /resourcePresentation\.render\(\);/);
assert.doesNotMatch(adapter, /RESOURCE_PRESENTATION_CORE_BRIDGE|NoBrainerResourcePresentationCore|getResourceHeaderPresentation/, 'Legacy-Ressourcenadapter besitzt weiterhin einen Presentation-Core.');
const bridgeMatch = adapter.match(/const RESOURCE_HEADER_RENDER = `([\s\S]*?)`;/);
assert.ok(bridgeMatch, 'Ausführbarer Legacy-Ressourcenwrapper konnte nicht gelesen werden.');
assert.doesNotMatch(bridgeMatch[1], /state\.gold|state\.inventory|formatHighestCurrency|document\.getElementById/, 'Ausführbarer Legacy-Ressourcenwrapper enthält weiterhin State- oder DOM-Präsentationslogik.');
assert.match(adapter, /const LEGACY_RESOURCE_HEADER = `/, 'Der reine Legacy-Suchanker für den bisherigen Inline-Renderer fehlt.');

assert.match(runtime, /private readonly resourcePresentation: GameResourcePresentationService/);
assert.match(runtime, /renderInitial\(\): void \{[\s\S]*this\.resourcePresentation\.render\(\);/, 'Initialer Angular-Render enthält die Ressourcen-Kopfzeile nicht.');
assert.match(runtime, /if \(marketCompleted\) \{[\s\S]*this\.resourcePresentation\.render\(\);/, 'Marktabschlüsse aktualisieren die Angular-Ressourcen-Kopfzeile nicht.');
assert.match(runtime, /if \(inventoryChanged\) \{[\s\S]*this\.resourcePresentation\.render\(\);[\s\S]*this\.forgePreviewPresentation\.render\(\);[\s\S]*runtime\.renderInventoryState\(\);/, 'Dungeon-Inventaränderungen aktualisieren Ressourcen und Angular-Schmiedevorschau nicht gezielt.');
assert.doesNotMatch(runtime, /refreshGold\(\): void;|runtime\.refreshGold\(\)/, 'GameRuntimeApi besitzt weiterhin den Legacy-Gold-Refresh.');

const registrationMatch = registration.match(/const ANGULAR_RUNTIME_REGISTRATION = `([\s\S]*?)`;/);
assert.ok(registrationMatch, 'Angular-Runtime-Registrierung konnte nicht gelesen werden.');
assert.doesNotMatch(registrationMatch[1], /refreshGold|renderResourceHeader\(\)/, 'Legacy-Runtime-Registrierung aktualisiert weiterhin die Ressourcen-Kopfzeile.');
assert.match(registrationMatch[1], /renderInventoryState:\(\)=>\{[\s\S]*renderMaterialStorage\(\);[\s\S]*renderMarketMaterials\(\);[\s\S]*\}/, 'Gezielter Legacy-Inventar-Refresh verliert Materiallager oder Markt.');
assert.doesNotMatch(registrationMatch[1], /renderForgePreview\(\)/, 'Gezielter Legacy-Inventar-Refresh rendert weiterhin die Angular-eigene Schmiedevorschau.');

const bridgeOpen = app.indexOf('this.gameResourcePresentation.openLegacyCompatibilityBridge();');
const stateBootstrap = app.indexOf('this.gameState.openBootstrapRegistration();');
assert.ok(bridgeOpen >= 0 && stateBootstrap > bridgeOpen, 'Ressourcen-Präsentationsbrücke muss vor dem State-/Legacy-Bootstrap geöffnet werden.');
assert.match(app, /private readonly gameResourcePresentation: GameResourcePresentationService/);
assert.match(app, /ngOnDestroy\(\): void \{[\s\S]*this\.gameResourcePresentation\.closeLegacyCompatibilityBridge\(\);/);
assert.match(app, /const APP_VERSION = APP_UI_VERSION;/);

console.log('Ressourcen-Präsentations-Eigentümerschaft: Nickel-State, sichtbare Münzstufe, Münzicon und Stadtübersicht werden direkt durch Angular gerendert; Legacy besitzt nur noch einen dünnen Renderwrapper.');
