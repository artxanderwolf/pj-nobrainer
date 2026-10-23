import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/app/app.component.ts', 'utf8');
const service = readFileSync('src/app/core/game-tavern-presentation.service.ts', 'utf8');
const adapter = readFileSync('src/app/core/legacy-tavern-presentation-adapter.service.ts', 'utf8');
const progressionAdapter = readFileSync('src/app/core/legacy-progression-adapter.service.ts', 'utf8');

assert.match(service, /constructor\([\s\S]*private readonly gameState: GameStateService,[\s\S]*private readonly gameProgression: GameProgressionService,[\s\S]*private readonly combatLog: GameCombatLogService,[\s\S]*private readonly characterPresentation: GameCharacterPresentationService,[\s\S]*private readonly resourcePresentation: GameResourcePresentationService/);
assert.match(service, /getTavernPresentation\(/, 'Angular-Tavernenservice verwendet den bestehenden Presentation-Core nicht.');
assert.match(service, /this\.gameProgression\.getRecruitOffer\('recruit'\)\.costNickel/, 'Rekrutierungskosten werden für die Tavernenanzeige nicht aus dem Angular-Progression-Service bezogen.');
assert.match(service, /document\.getElementById\('tavernOffer'\)/, 'Angular-Tavernenservice rendert die Rekrutierungsangebote nicht.');
assert.match(service, /document\.getElementById\('tavernCapacity'\)/, 'Angular-Tavernenservice rendert die Kapazitätsanzeige nicht.');
assert.match(service, /document\.getElementById\('baseTavernSummary'\)/, 'Angular-Tavernenservice rendert die Übersichts-Zusammenfassung nicht.');
assert.match(service, /offer\.dataset\['tavernPresentationOwner'\] = 'angular';/, 'Angular-Tavernenrenderer markiert seinen finalen Browser-Output nicht.');
assert.match(service, /character-selection-page recruitment-selection-page/, 'Rekrutierung verwendet nicht die gemeinsame Listenstruktur.');
assert.match(service, /class="character-list-item recruitment-list-item/, 'Die kompakte Rekrutierungsliste fehlt.');
assert.match(service, /data-character-modal="recruitment"/, 'Rekrutierungsdetails liegen nicht in einem eigenen Modal.');
assert.match(service, /data-tavern-action="select-offer"/, 'Rekrutierungsangebote besitzen keinen Angular-Auswahlanker.');
assert.match(service, /data-tavern-action="recruit"/, 'Das Rekrutierungsmodal besitzt keine Angular-Rekrutierungsaktion.');
assert.match(service, /this\.gameProgression\.recruit\(classId\)/, 'Rekrutierung läuft nicht direkt über den bestehenden Angular-Progression-Service.');
assert.match(service, /this\.characterPresentation\.render\(\)/, 'Erfolgreiche Rekrutierung aktualisiert den Angular-Kader nicht.');
assert.match(service, /this\.resourcePresentation\.render\(\)/, 'Erfolgreiche Rekrutierung aktualisiert die Geldanzeige nicht.');
assert.doesNotMatch(service, /onclick="recruitCharacter|recruitCharacter\(/, 'Die neue Rekrutierungs-UI darf nicht mehr den Legacy-Rekrutierungsaufruf verwenden.');
assert.doesNotMatch(service, /onclick="go\('base'\)"/, 'Die Kapazitätsansicht darf keinen veralteten Rücksprung zum früheren Stützpunkt mehr erzeugen.');
assert.match(service, /capacity\.innerHTML = `<div class="statrow">/, 'Kapazitätswerte werden nicht kompakt gerendert.');
assert.match(service, /window\.NoBrainerTavernPresentationCompatibility = \{ render: \(\) => this\.render\(\) \};/);
assert.match(service, /delete window\.NoBrainerTavernPresentationCompatibility;/);

assert.doesNotMatch(adapter, /TAVERN_PRESENTATION_CORE_BRIDGE|NoBrainerTavernPresentationCore/);
assert.match(adapter, /window\.NoBrainerTavernPresentationCompatibility/);
assert.match(adapter, /tavernPresentation\.render\(\);/);
assert.doesNotMatch(adapter, /getTavernPresentation|state\.characters|state\.upgrades|state\.gold|formatCurrencyNickel/, 'Legacy-Tavernenadapter enthält weiterhin Präsentations- oder State-Logik.');
assert.doesNotMatch(progressionAdapter, /RECRUIT_BRIDGE|progressionCompatibility\.recruit/, 'Der berührte Rekrutierungsaktionspfad darf nicht mehr über Legacy delegieren.');
assert.match(progressionAdapter, /replaceOnce\(source, RECRUIT_BLOCK, '', 'Rekrutierungsablauf'\)/, 'Die alte Legacy-Rekrutierungsfunktion wird nicht aus der Runtime entfernt.');

const bridgeOpen = app.indexOf('this.gameTavernPresentation.openLegacyCompatibilityBridge();');
const stateBootstrap = app.indexOf('this.gameState.openBootstrapRegistration();');
assert.ok(bridgeOpen >= 0 && stateBootstrap > bridgeOpen, 'Tavernen-Präsentationsbrücke muss vor dem State-/Legacy-Bootstrap geöffnet werden.');
assert.match(app, /private readonly gameTavernPresentation: GameTavernPresentationService/);
assert.match(app, /ngOnDestroy\(\): void \{[\s\S]*this\.gameTavernPresentation\.closeLegacyCompatibilityBridge\(\);/);

console.log('Tavernen-Präsentations-Eigentümerschaft: Rekrutierung nutzt dieselbe Listen-/Modalstruktur wie der Kader und führt Anwerben direkt über den Angular-Progression-Service aus; Kapazität bleibt Angular-eigen.');
