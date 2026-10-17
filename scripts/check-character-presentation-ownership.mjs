import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/app/app.component.ts', 'utf8');
const service = readFileSync('src/app/core/game-character-presentation.service.ts', 'utf8');
const weaponPresentationService = readFileSync('src/app/core/game-weapon-presentation.service.ts', 'utf8');
const runtime = readFileSync('src/app/core/game-runtime.service.ts', 'utf8');
const registration = readFileSync('src/app/core/legacy-runtime-registration-adapter.service.ts', 'utf8');
const characterAdapter = readFileSync('src/app/core/legacy-character-presentation-adapter.service.ts', 'utf8');
const equipmentAdapter = readFileSync('src/app/core/legacy-equipment-adapter.service.ts', 'utf8');

assert.match(service, /constructor\([\s\S]*private readonly gameState: GameStateService,[\s\S]*private readonly gameEquipment: GameEquipmentService,[\s\S]*private readonly weaponPresentation: GameWeaponPresentationService/);
assert.match(service, /getCharacterCardPresentation\(/, 'Angular-Kaderdarstellung nutzt den Character-Presentation-Core nicht.');
assert.match(service, /calculateCharacterStats\([\s\S]*character\.classId,[\s\S]*this\.getEquippedWeapons\(character\),[\s\S]*characterStatLevelMultiplier\(character\.level\)[\s\S]*\)/, 'Angular-Kader löst Level-, Klassen- und Waffenboni nicht über das gemeinsame Statmodell auf.');
assert.match(weaponPresentationService, /createWeaponPresentationCore\(/, 'Gemeinsame Angular-Waffenpräsentation nutzt den Weapon-Presentation-Core nicht.');
assert.match(service, /weaponPresentation\.renderCard\(/, 'Angular-Kader nutzt die gemeinsame Waffenkarten-Präsentation nicht.');
assert.match(service, /weaponDamageAfterArmor\(weapon, 0, stats\)\.raw/, 'Die gemeinsame Waffen-/Charakter-Offensivberechnung wird im Kader nicht wiederverwendet.');
assert.match(service, /gameEquipment\.getWeaponPickerPresentation\(/, 'Waffenpicker liest Equipment-Zustand nicht über den Angular-Service.');
assert.match(service, /gameEquipment\.equipWeapon\(/, 'Waffenpicker rüstet nicht über den Angular-Equipment-Service aus.');
assert.match(service, /gameEquipment\.unequipHand\(/, 'Waffenpicker legt nicht über den Angular-Equipment-Service ab.');
assert.match(service, /data-roster-action="toggle-picker"/, 'Angular-Kader besitzt keinen eigenen Picker-Aktionsanker.');
assert.match(service, /data-roster-action="equip-weapon"/, 'Angular-Kader besitzt keinen eigenen Ausrüsten-Aktionsanker.');
assert.match(service, /data-roster-action="clear-hand"/, 'Angular-Kader besitzt keinen eigenen Ablegen-Aktionsanker.');
assert.match(service, /renderIfIdle\(\): void/, 'Der Angular-Kader besitzt keinen fokus-schonenden Tick-Render.');

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
assert.match(app, /const APP_VERSION = '0\.12\.86';/);

console.log('Character-Präsentations-Eigentümerschaft: Kader zeigt Levelskalierung sowie aufgelöste Klassen-/Waffenstats; Waffenpicker und Equipment-Aktionen bleiben Angular-eigen.');
