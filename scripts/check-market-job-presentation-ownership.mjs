import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/app/app.component.ts', 'utf8');
const service = readFileSync('src/app/core/game-market-job-presentation.service.ts', 'utf8');
const adapter = readFileSync('src/app/core/legacy-market-presentation-adapter.service.ts', 'utf8');
const runtime = readFileSync('src/app/core/game-runtime.service.ts', 'utf8');
const registration = readFileSync('src/app/core/legacy-runtime-registration-adapter.service.ts', 'utf8');

assert.match(service, /private readonly gameState: GameStateService/, 'Marktauftrags-Präsentation liest nicht aus dem Angular-State.');
assert.match(service, /private readonly progressionPresentation: GameProgressionPresentationService/, 'Marktauftrags-Präsentation aktualisiert die Ausbaukarten nicht über Angular.');
assert.match(service, /getActiveMarketJobPresentation\(job, index, now, formatCurrencyNickel, formatDuration\)/, 'Aktive Marktaufträge verwenden den bestehenden Presentation-Core nicht.');
assert.match(service, /getQueuedMarketJobPresentation\(job, index, formatCurrencyNickel, formatDuration\)/, 'Markt-Warteschlange verwendet den bestehenden Presentation-Core nicht.');
assert.match(service, /document\.getElementById\('marketJobCard'\)/);
assert.match(service, /document\.getElementById\('marketQueueCard'\)/);
assert.match(service, /marketJobPresentationOwner'\] = 'angular'/, 'Browser-nachweisbarer Angular-Ownership-Marker fehlt.');
assert.match(service, /onclick="cancelMarketSale\('active',\$\{index\}\)"/, 'Bestehende Abbrechen-Aktion wird im Angular-Renderer nicht beibehalten.');
assert.match(service, /onclick="cancelMarketSale\('queue',\$\{index\}\)"/, 'Bestehende Entfernen-Aktion wird im Angular-Renderer nicht beibehalten.');
assert.match(service, /Kein aktiver Verkauf\./);
assert.match(service, /Warteschlange leer\./);
assert.match(service, /this\.progressionPresentation\.render\(\);/, 'Marktaufträge aktualisieren die kapazitätsabhängigen Ausbaukarten nicht.');
assert.match(service, /window\.NoBrainerMarketJobPresentationCompatibility = \{ render: \(\) => this\.render\(\) \};/);
assert.match(service, /delete window\.NoBrainerMarketJobPresentationCompatibility;/);

const presentationMatch = adapter.match(/const ADAPTED_MARKET_PRESENTATION = `([\s\S]*?)`;/);
assert.ok(presentationMatch, 'Der adaptierte Markt-Präsentationsblock konnte nicht gelesen werden.');
const renderJobEnd = presentationMatch[1].indexOf('function setMarketQty(');
assert.ok(renderJobEnd > 0, 'Der dünne renderMarketJob-Wrapper konnte nicht isoliert werden.');
const renderJob = presentationMatch[1].slice(0, renderJobEnd);
assert.match(renderJob, /window\.NoBrainerMarketJobPresentationCompatibility/);
assert.match(renderJob, /marketJobPresentation\.render\(\);/);
assert.doesNotMatch(renderJob, /state\.marketJobs|state\.marketQueue|getActiveMarketJobPresentation|getQueuedMarketJobPresentation|formatCurrencyNickel|formatDuration|innerHTML|renderUpgradeCards/, 'Legacy-renderMarketJob enthält weiterhin State- oder DOM-Präsentationslogik.');
assert.match(adapter, /MARKET_PRESENTATION_CORE_BRIDGE/, 'Der verbleibende Material-/Waffenmarkt nutzt den gemeinsamen Presentation-Core nicht mehr.');
assert.match(adapter, /getMarketMaterialPresentation/, 'Materialverkaufs-Präsentation wurde in diesem begrenzten Cut versehentlich entfernt.');
assert.match(adapter, /getMarketWeaponPresentation/, 'Waffenverkaufs-Präsentation wurde in diesem begrenzten Cut versehentlich entfernt.');

assert.match(runtime, /private readonly marketJobPresentation: GameMarketJobPresentationService/);
assert.match(runtime, /renderInitial\(\): void \{[\s\S]*this\.marketJobPresentation\.render\(\);/, 'Initialer Angular-Render enthält Marktaufträge nicht.');
assert.match(runtime, /private runTickCycle\(\): void \{[\s\S]*this\.marketJobPresentation\.render\(\);/, 'Der zentrale Angular-Tick rendert Marktaufträge nicht direkt.');
assert.doesNotMatch(runtime, /renderMarketJob\(\): void;|runtime\.renderMarketJob\(\)/, 'GameRuntimeApi besitzt weiterhin den Legacy-Marktauftragsrenderer.');

const registrationMatch = registration.match(/const ANGULAR_RUNTIME_REGISTRATION = `([\s\S]*?)`;/);
assert.ok(registrationMatch, 'Angular-Runtime-Registrierung konnte nicht gelesen werden.');
assert.doesNotMatch(registrationMatch[1], /\n  renderMarketJob,/, 'Legacy-Runtime registriert weiterhin renderMarketJob bei Angular.');
assert.match(registrationMatch[1], /renderMarketMaterials/);
assert.match(registrationMatch[1], /renderMarketWeapons/);

const bridgeOpen = app.indexOf('this.gameMarketJobPresentation.openLegacyCompatibilityBridge();');
const stateBootstrap = app.indexOf('this.gameState.openBootstrapRegistration();');
assert.ok(bridgeOpen >= 0 && stateBootstrap > bridgeOpen, 'Marktauftrags-Präsentationsbrücke muss vor dem State-/Legacy-Bootstrap geöffnet werden.');
assert.match(app, /private readonly gameMarketJobPresentation: GameMarketJobPresentationService/);
assert.match(app, /ngOnDestroy\(\): void \{[\s\S]*this\.gameMarketJobPresentation\.closeLegacyCompatibilityBridge\(\);/);
assert.match(app, /const APP_VERSION = '0\.12\.81';/);

console.log('Marktauftrags-Präsentations-Eigentümerschaft: aktive Verkäufe und Warteschlange werden direkt durch Angular aus dem Angular-State gerendert; Material- und Waffenverkaufslisten bleiben bewusst im nächsten Legacy-Präsentationsschnitt.');
