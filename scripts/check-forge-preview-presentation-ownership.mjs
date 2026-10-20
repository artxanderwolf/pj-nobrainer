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
assert.match(service, /this\.gameForge\.preview\(weaponForm, slots\)/, 'Angular-Schmiedevorschau bezieht Waffenwerte nicht über GameForgeService.');
assert.match(service, /this\.gameForge\.requirements\(weaponForm, preview\.slots\)/, 'Angular-Schmiedevorschau verwendet nicht den Bauplan-Materialbedarf.');
assert.match(service, /this\.gameForge\.selectionQuantities\(weaponForm\)/, 'Angular-Schmiedevorschau verwendet nicht die Bauplan-Materialmengen.');
assert.match(service, /Object\.values\(MATERIAL_REFERENCES_BY_ID\)/, 'Angular-Schmiedevorschau baut die Materialauswahl nicht aus den stabilen Materialreferenzen.');
assert.match(service, /getMaterialQuantityById\(state\.inventory, reference\.materialId\)/, 'Schmiedevorschau prüft Lagerbestände nicht per Material-ID.');
assert.match(service, /option\.value = String\(reference\.materialId\)/, 'Materialauswahl speichert weiterhin Materialnamen als Optionswert.');
assert.match(service, /materialId: this\.readSelectedMaterialId\(binding\.id\)/, 'Schmiedeauswahl erzeugt keine ID-basierten Waffenslots.');
assert.match(service, /reinforcementEffectText\(reference\.displayName\)/, 'SPE-Text fehlt in der Angular-Materialauswahl.');
for (const binding of [
  "{ id: 'slotWorkingPart', rowId: 'forgeWorkingPartRow', slot: 'workingPart' }",
  "{ id: 'slotBack', rowId: 'forgeBackRow', slot: 'back' }",
  "{ id: 'slotGripCore', rowId: 'forgeGripCoreRow', slot: 'gripCore' }",
  "{ id: 'slotGripWrap', rowId: 'forgeGripWrapRow', slot: 'gripWrap' }",
  "{ id: 'slotSpecial', rowId: 'forgeSpecialRow', slot: 'special' }",
  "{ id: 'slotParry', rowId: 'forgeParryRow', slot: 'parry' }",
  "{ id: 'slotBowstring', rowId: 'forgeBowstringRow', slot: 'bowstring' }"
]) assert.ok(service.includes(binding), `Neue Schmiedebindung fehlt: ${binding}`);
assert.match(service, /document\.getElementById\('weaponForm'\)/, 'Angular-Schmiedevorschau liest die aktuelle Waffenform-DOM-ID nicht.');
assert.match(service, /this\.populateWeaponFormSelect\(\)/, 'Die Schmiede bereitet die sichtbaren Waffenformen nicht vor der Vorschau auf.');
assert.match(service, /this\.gameForge\.visibleWeaponForms\(\)/, 'Die Waffenform-Auswahl bezieht die Sichtbarkeit nicht aus der Angular-Freischaltlogik.');
assert.match(service, /this\.gameForge\.unlockState\(weaponForm\)/, 'Die Waffenform-Auswahl bezieht den Sperrstatus nicht aus der Angular-Freischaltlogik.');
assert.match(service, /option\.disabled = !unlock\.unlocked/, 'Sichtbare, noch gesperrte Waffenformen werden nicht deaktiviert dargestellt.');
assert.match(service, /select\.dataset\['weaponUnlockOwner'\] = 'angular'/, 'Browser-nachweisbarer Angular-Ownership-Marker für Waffenfreischaltungen fehlt.');
assert.match(service, /select\.dataset\['visibleWeaponForms'\] = visibleWeaponForms\.join\(','\)/, 'Browser-nachweisbare Liste sichtbarer Waffenformen fehlt.');
assert.match(service, /document\.getElementById\('forgePreviewNextBtn'\)/, 'Angular-Schmiedevorschau verwaltet den Weiter-zur-Vorschau-Button nicht.');
assert.match(service, /previewNextButton\.disabled = false/, 'Vorschau-Navigation darf nicht durch Herstellungsvalidierung blockiert werden.');
assert.doesNotMatch(service, /previewNextButton\.disabled = !complete/, 'Vorschau-Navigation darf nicht erneut an die Vollständigkeitsprüfung gekoppelt werden.');
assert.doesNotMatch(service, /slotBaseMaterial|slotBlade|slotGripShape|slotGripMaterial|slotReinforcementMaterial/, 'Angular-Schmiedevorschau verwendet weiterhin alte Schmiede-DOM-IDs.');
assert.match(service, /row\.hidden = !active/, 'Optionale Bauplanzeilen werden nicht dynamisch ein-/ausgeblendet.');
for (const id of [
  'forgeTimePreview', 'forgeValuePreview', 'forgeDamagePreview', 'forgeDamageBaseInfo',
  'forgeSpeedPreview', 'forgeSpeedBaseInfo', 'forgeHitPreview', 'forgeRawPreview',
  'forgePenPreview', 'forgeRarityPreview', 'forgeReinforcementPreview', 'forgeParryInfo', 'forgeMaterialTotalPreview'
]) assert.match(service, new RegExp(`'${id}'`), `Angular-Schmiedevorschau rendert ${id} nicht.`);
assert.match(service, /startButton\.dataset\['forgePreviewPresentationOwner'\] = 'angular'/, 'Browser-nachweisbarer Angular-Ownership-Marker fehlt.');
assert.match(service, /window\.NoBrainerForgePreviewPresentationCompatibility = \{ render: \(\) => this\.render\(\) \};/);
assert.match(service, /delete window\.NoBrainerForgePreviewPresentationCompatibility;/);

assert.match(adapter, /window\.NoBrainerForgePreviewPresentationCompatibility/);
assert.match(adapter, /forgePreviewPresentation\.render\(\);/);
assert.doesNotMatch(adapter, /NoBrainerForgePresentationCore|FORGE_PRESENTATION_CORE_BRIDGE|getForgePreviewPresentation|populateForgeSelects\(\);|state\.forgeJobs|state\.forgeQueue/, 'Legacy-Schmiedevorschau enthält weiterhin Presentation-Core-, State- oder DOM-Aufbereitungslogik.');

assert.match(runtime, /private readonly forgePreviewPresentation: GameForgePreviewPresentationService/);
assert.match(runtime, /renderInitial\(\): void \{[\s\S]*this\.forgePreviewPresentation\.render\(\);/, 'Initialer Angular-Render enthält die Schmiedevorschau nicht.');
assert.match(runtime, /if \(forgeCompleted\) \{[\s\S]*this\.forgePreviewPresentation\.render\(\);[\s\S]*this\.weaponInventoryPresentation\.render\(\);/, 'Schmiedeabschluss aktualisiert Vorschau und Waffenlager nicht gezielt über Angular.');

const registrationMatch = registration.match(/const ANGULAR_RUNTIME_REGISTRATION = `([\s\S]*?)`;/);
assert.ok(registrationMatch, 'Angular-Runtime-Registrierung konnte nicht gelesen werden.');
assert.doesNotMatch(registrationMatch[1], /renderForgePreview/, 'Legacy-Runtime-Registrierung exportiert oder ruft weiterhin renderForgePreview auf.');

const bridgeOpen = app.indexOf('this.gameForgePreviewPresentation.openLegacyCompatibilityBridge();');
const stateBootstrap = app.indexOf('this.gameState.openBootstrapRegistration();');
assert.ok(bridgeOpen >= 0 && stateBootstrap > bridgeOpen, 'Schmiedevorschau-Präsentationsbrücke muss vor dem State-/Legacy-Bootstrap geöffnet werden.');
assert.match(app, /private readonly gameForgePreviewPresentation: GameForgePreviewPresentationService/);
assert.match(app, /const APP_VERSION = APP_UI_VERSION;/);

console.log('Forge-Preview-Presentation: Materialauswahl arbeitet per ID; Waffenfreischaltung, Bauplan-Auswahl und Herstellungsvalidierung bleiben Angular-eigen.');
