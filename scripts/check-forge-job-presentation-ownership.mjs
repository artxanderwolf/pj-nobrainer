import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/app/app.component.ts', 'utf8');
const service = readFileSync('src/app/core/game-forge-job-presentation.service.ts', 'utf8');
const adapter = readFileSync('src/app/core/legacy-forge-presentation-adapter.service.ts', 'utf8');
const runtime = readFileSync('src/app/core/game-runtime.service.ts', 'utf8');
const registration = readFileSync('src/app/core/legacy-runtime-registration-adapter.service.ts', 'utf8');

assert.match(service, /private readonly gameState: GameStateService/, 'Schmiedeauftrags-Präsentation liest nicht aus dem Angular-State.');
assert.match(service, /private readonly progressionPresentation: GameProgressionPresentationService/, 'Schmiedeauftrags-Präsentation aktualisiert die Ausbaukarten nicht über Angular.');
assert.match(service, /getActiveForgeJobPresentation\(job, index, now, formatCurrencyNickel, formatDuration\)/, 'Aktive Schmiedeaufträge verwenden den bestehenden Presentation-Core nicht.');
assert.match(service, /getQueuedForgeJobPresentation\(job, index, formatDuration\)/, 'Schmiede-Warteschlange verwendet den bestehenden Presentation-Core nicht.');
assert.match(service, /document\.getElementById\('forgeJobCard'\)/);
assert.match(service, /document\.getElementById\('forgeQueueCard'\)/);
assert.match(service, /forgeJobPresentationOwner'\] = 'angular'/, 'Browser-nachweisbarer Angular-Ownership-Marker fehlt.');
assert.match(service, /Kein aktiver Schmiedeauftrag\./);
assert.match(service, /Warteschlange leer\./);
assert.match(service, /this\.progressionPresentation\.render\(\);/, 'Schmiedeaufträge aktualisieren die kapazitätsabhängigen Ausbaukarten nicht.');
assert.match(service, /window\.NoBrainerForgeJobPresentationCompatibility = \{ render: \(\) => this\.render\(\) \};/);
assert.match(service, /delete window\.NoBrainerForgeJobPresentationCompatibility;/);

const jobsMatch = adapter.match(/const ADAPTED_FORGE_JOBS = `([\s\S]*?)`;/);
assert.ok(jobsMatch, 'Der dünne Legacy-renderForgeJob-Wrapper konnte nicht gelesen werden.');
assert.match(jobsMatch[1], /window\.NoBrainerForgeJobPresentationCompatibility/);
assert.match(jobsMatch[1], /forgeJobPresentation\.render\(\);/);
assert.doesNotMatch(jobsMatch[1], /state\.forgeJobs|state\.forgeQueue|getActiveForgeJobPresentation|getQueuedForgeJobPresentation|formatCurrencyNickel|formatDuration|innerHTML/, 'Legacy-renderForgeJob enthält weiterhin State- oder DOM-Präsentationslogik.');
assert.match(adapter, /window\.NoBrainerForgePreviewPresentationCompatibility/, 'Die Angular-eigene Schmiedevorschau-Brücke fehlt im gemeinsamen Forge-Präsentationsadapter.');
assert.doesNotMatch(adapter, /NoBrainerForgePresentationCore|FORGE_PRESENTATION_CORE_BRIDGE/, 'Der Forge-Präsentationsadapter registriert weiterhin den alten Legacy-Presentation-Core.');

assert.match(runtime, /private readonly forgeJobPresentation: GameForgeJobPresentationService/);
assert.match(runtime, /renderInitial\(\): void \{[\s\S]*this\.forgeJobPresentation\.render\(\);/, 'Initialer Angular-Render enthält Schmiedeaufträge nicht.');
assert.match(runtime, /private runTickCycle\(\): void \{[\s\S]*this\.forgeJobPresentation\.render\(\);/, 'Der zentrale Angular-Tick rendert Schmiedeaufträge nicht direkt.');
assert.doesNotMatch(runtime, /renderForgeJob\(\): void;|runtime\.renderForgeJob\(\)/, 'GameRuntimeApi besitzt weiterhin den Legacy-Schmiedeauftragsrenderer.');

const registrationMatch = registration.match(/const ANGULAR_RUNTIME_REGISTRATION = `([\s\S]*?)`;/);
assert.ok(registrationMatch, 'Angular-Runtime-Registrierung konnte nicht gelesen werden.');
assert.doesNotMatch(registrationMatch[1], /\n  renderForgeJob,/, 'Legacy-Runtime registriert weiterhin renderForgeJob bei Angular.');

const bridgeOpen = app.indexOf('this.gameForgeJobPresentation.openLegacyCompatibilityBridge();');
const stateBootstrap = app.indexOf('this.gameState.openBootstrapRegistration();');
assert.ok(bridgeOpen >= 0 && stateBootstrap > bridgeOpen, 'Schmiedeauftrags-Präsentationsbrücke muss vor dem State-/Legacy-Bootstrap geöffnet werden.');
assert.match(app, /private readonly gameForgeJobPresentation: GameForgeJobPresentationService/);
assert.match(app, /ngOnDestroy\(\): void \{[\s\S]*this\.gameForgeJobPresentation\.closeLegacyCompatibilityBridge\(\);/);
assert.match(app, /const APP_VERSION = '0\.12\.82';/);

console.log('Schmiedeauftrags-Präsentations-Eigentümerschaft: aktive Aufträge und Warteschlange werden direkt durch Angular aus dem Angular-State gerendert; Legacy besitzt nur noch einen dünnen renderForgeJob-Wrapper.');
