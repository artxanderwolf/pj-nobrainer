import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/app/app.component.ts', 'utf8');
const service = readFileSync('src/app/core/game-character-presentation.service.ts', 'utf8');
const weaponPresentationService = readFileSync('src/app/core/game-weapon-presentation.service.ts', 'utf8');
const runtime = readFileSync('src/app/core/game-runtime.service.ts', 'utf8');
const registration = readFileSync('src/app/core/legacy-runtime-registration-adapter.service.ts', 'utf8');
const characterAdapter = readFileSync('src/app/core/legacy-character-presentation-adapter.service.ts', 'utf8');
const equipmentAdapter = readFileSync('src/app/core/legacy-equipment-adapter.service.ts', 'utf8');
const angularConfig = JSON.parse(readFileSync('angular.json', 'utf8'));
const rosterCss = readFileSync('src/roster-compact-v0.15.5.css', 'utf8');

assert.match(service, /constructor\([\s\S]*private readonly gameState: GameStateService,[\s\S]*private readonly gameEquipment: GameEquipmentService,[\s\S]*private readonly weaponPresentation: GameWeaponPresentationService/);
assert.match(service, /getCharacterCardPresentation\(/, 'Angular-Kaderdarstellung nutzt den Character-Presentation-Core nicht.');
assert.match(service, /calculateCharacterStats\([\s\S]*character\.classId,[\s\S]*this\.getEquippedWeapons\(character\),[\s\S]*characterStatLevelMultiplier\(character\.level\)[\s\S]*\)/, 'Angular-Kader löst Level-, Klassen- und Waffenboni nicht über das gemeinsame Statmodell auf.');
assert.match(weaponPresentationService, /createWeaponPresentationCore\(/, 'Gemeinsame Angular-Waffenpräsentation nutzt den Weapon-Presentation-Core nicht.');
assert.match(service, /weaponPresentation\.renderCard\(/, 'Angular-Kader nutzt die gemeinsame Waffenkarten-Präsentation nicht.');
assert.match(service, /weaponDamageAfterArmor\(weapon, 0, stats\)\.raw/, 'Die gemeinsame Waffen-/Charakter-Offensivberechnung wird im Kader nicht wiederverwendet.');
assert.match(service, /gameEquipment\.getWeaponPickerPresentation\(/, 'Waffenpicker liest Equipment-Zustand nicht über den Angular-Service.');
assert.match(service, /gameEquipment\.equipWeapon\(/, 'Waffenpicker rüstet nicht über den Angular-Equipment-Service aus.');
assert.match(service, /gameEquipment\.unequipHand\(/, 'Waffenpicker legt nicht über den Angular-Equipment-Service ab.');
assert.match(service, /data-roster-presentation-owner="angular"/, 'Der neue Kader besitzt keinen Angular-Ownership-Marker.');
assert.match(service, /class="roster-list-item/, 'Die kompakte Kaderliste fehlt.');
assert.match(service, /class="class-emblem class-emblem-small" data-class-id=/, 'Kleine Klassenembleme werden nicht über stabile Klassen-IDs zugeordnet.');
assert.match(service, /class="class-emblem class-emblem-large" data-class-id=/, 'Große Klassenembleme werden nicht über stabile Klassen-IDs zugeordnet.');
assert.match(service, /data-roster-action="edit-name"/, 'Das Umbenennen besitzt keinen kleinen Kader-Aktionsanker.');
assert.match(service, /data-roster-action="save-name"/, 'Das Umbenennen besitzt keine explizite Speicheraktion.');
assert.match(service, /data-roster-action="stat-page-prev"/, 'Die Werteseiten besitzen keine Rückwärtsnavigation.');
assert.match(service, /data-roster-action="stat-page-next"/, 'Die Werteseiten besitzen keine Vorwärtsnavigation.');
assert.match(service, /class="roster-equipment-layer"/, 'Der Kader besitzt keinen kompakten Ausrüstungs-Layer.');
assert.match(service, /data-roster-action="toggle-picker"/, 'Angular-Kader besitzt keinen eigenen Picker-Aktionsanker.');
assert.match(service, /data-roster-action="equip-weapon"/, 'Angular-Kader besitzt keinen eigenen Ausrüsten-Aktionsanker.');
assert.match(service, /data-roster-action="clear-hand"/, 'Angular-Kader besitzt keinen eigenen Ablegen-Aktionsanker.');
assert.match(service, /renderIfIdle\(\): void/, 'Der Angular-Kader besitzt keinen fokus-schonenden Tick-Render.');
assert.match(service, /CHARACTER_ASSET_IDS[\s\S]*'recruit'[\s\S]*'fighter'[\s\S]*'archer'[\s\S]*'scholar'/, 'Klassenassets sind nicht über die stabilen Klassen-IDs definiert.');
assert.doesNotMatch(service, /className\s*===|name\s*===\s*['"](?:Rekrut|Kämpfer|Bogner|Gelehrter)/, 'Klassenassets dürfen nicht über sichtbare Klassennamen identifiziert werden.');

assert.match(rosterCss, /class-emblems-compact\.png/, 'Kleines Emblem-Spritesheet fehlt im Kader-CSS.');
assert.match(rosterCss, /class-emblems-detail\.png/, 'Großes Emblem-Spritesheet fehlt im Kader-CSS.');
assert.match(rosterCss, /data-class-id='archer'/);
assert.match(rosterCss, /data-class-id='scholar'/);
assert.match(rosterCss, /data-class-id='recruit'/);
assert.match(rosterCss, /data-class-id='fighter'/);
assert.ok((angularConfig.projects?.nobrainer?.architect?.build?.options?.styles ?? []).includes('src/roster-compact-v0.15.5.css'));

assert.match(runtime, /private readonly characterPresentation: GameCharacterPresentationService/, 'GameRuntimeService besitzt keinen Angular-Kader-Präsentationsservice.');
assert.match(runtime, /this\.characterPresentation\.bindActions\(\(\) => \{[\s\S]*this\.weaponInventoryPresentation\.render\(\);[\s\S]*runtime\.renderMarketWeapons\(\);[\s\S]*\}\);/, 'Equipment-Änderungen aus dem Kader aktualisieren abhängige Ansichten nicht gezielt.');
assert.match(runtime, /renderInitial\(\): void \{[\s\S]*this\.characterPresentation\.render\(\);[\s\S]*this\.dungeonPresentation\.render\(\);/, 'Initialer Angular-Render enthält den Kader nicht.');
assert.match(runtime, /private runTickCycle\(\): void \{[\s\S]*this\.characterPresentation\.renderIfIdle\(\);/, 'Der zentrale Angular-Tick aktualisiert den Kader nicht.');
assert.doesNotMatch(runtime, /renderRosterIfIdle/, 'GameRuntimeApi exportiert weiterhin den Legacy-Kaderrenderer.');

const registrationMatch = registration.match(/const ANGULAR_RUNTIME_REGISTRATION = `([\s\S]*?)`;/);
assert.ok(registrationMatch, 'Angular-Runtime-Registrierung konnte nicht gelesen werden.');
assert.doesNotMatch(registrationMatch[1], /renderRosterIfIdle|openWeaponPickerHand|renderCharacter\(/, 'Legacy-Runtime-Registrierung besitzt weiterhin Kader-Präsentationslogik.');
assert.doesNotMatch(characterAdapter, /NoBrainerCharacterPresentationCore|CHARACTER_PRESENTATION_CORE_BRIDGE/, 'Legacy-Character-Adapter registriert weiterhin Presentation-Logik.');
assert.doesNotMatch(equipmentAdapter, /getWeaponPickerPresentation/, 'Legacy-Equipment-Adapter enthält weiterhin die Kader-Waffenpicker-Präsentation.');
assert.match(app, /const APP_VERSION = APP_UI_VERSION;/);

console.log('Character-Präsentations-Eigentümerschaft: kompakte Kaderliste, ID-basierte Klassenembleme, Detailansicht, Umbenennen, Werteseiten und Ausrüstungs-Layer bleiben Angular-eigen und verwenden die bestehende Equipment-Logik.');
