import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/app/app.component.ts', 'utf8');
const runtime = readFileSync('src/app/core/game-runtime.service.ts', 'utf8');
const registration = readFileSync('src/app/core/legacy-runtime-registration-adapter.service.ts', 'utf8');
const inventoryService = readFileSync('src/app/core/game-weapon-inventory-presentation.service.ts', 'utf8');
const weaponPresentationService = readFileSync('src/app/core/game-weapon-presentation.service.ts', 'utf8');
const characterPresentationService = readFileSync('src/app/core/game-character-presentation.service.ts', 'utf8');
const legacyWeaponAdapter = readFileSync('src/app/core/legacy-weapon-presentation-adapter.service.ts', 'utf8');

assert.match(weaponPresentationService, /createWeaponPresentationCore\(/, 'Der gemeinsame Angular-Waffenpräsentationsservice verwendet den Presentation-Core nicht.');
assert.match(weaponPresentationService, /renderCard\(/, 'Der gemeinsame Angular-Waffenpräsentationsservice rendert keine Waffenkarten.');
assert.match(characterPresentationService, /private readonly weaponPresentation: GameWeaponPresentationService/, 'Der Kader verwendet den gemeinsamen Angular-Waffenpräsentationsservice nicht.');
assert.doesNotMatch(characterPresentationService, /createWeaponPresentationCore\(/, 'Der Kader erzeugt weiterhin einen zweiten Weapon-Presentation-Core.');

assert.match(inventoryService, /private readonly gameState: GameStateService/, 'Waffenlager-Präsentation liest nicht aus dem Angular-State.');
assert.match(inventoryService, /private readonly gameEquipment: GameEquipmentService/, 'Waffenlager-Präsentation verwendet den Angular-Equipment-Service nicht.');
assert.match(inventoryService, /private readonly weaponPresentation: GameWeaponPresentationService/, 'Waffenlager-Präsentation verwendet den gemeinsamen Waffenpräsentationsservice nicht.');
assert.match(inventoryService, /this\.weaponPresentation\.sortWeaponInventory\(this\.state\(\)\.weaponInventory\)/, 'Waffenlager sortiert nicht über den bestehenden Presentation-Core.');
assert.match(inventoryService, /this\.gameEquipment\.getWeaponInventoryPresentation\(weapon\.id\)/, 'Waffenlager liest Belegung und freie Ziele nicht über GameEquipmentService.');
assert.match(inventoryService, /data-weapon-inventory-action="equip"/, 'Angular-Waffenlager besitzt keinen eigenen Ausrüsten-Aktionsanker.');
assert.match(inventoryService, /data-weapon-inventory-action="unequip"/, 'Angular-Waffenlager besitzt keinen eigenen Ablegen-Aktionsanker.');
assert.match(inventoryService, /this\.gameEquipment\.equipWeapon\(weaponId, hand, characterId\)/, 'Angular-Waffenlager rüstet nicht über GameEquipmentService aus.');
assert.match(inventoryService, /this\.gameEquipment\.unequipHand\(characterId, hand\)/, 'Angular-Waffenlager legt nicht über GameEquipmentService ab.');
assert.match(inventoryService, /window\.NoBrainerWeaponInventoryPresentationCompatibility = \{ render: \(\) => this\.render\(\) \};/, 'Die dünne Legacy-Renderbrücke für Vollrender fehlt.');
assert.match(inventoryService, /delete window\.NoBrainerWeaponInventoryPresentationCompatibility;/, 'Die Waffenlager-Kompatibilitätsbrücke wird nicht geschlossen.');

assert.match(legacyWeaponAdapter, /weaponInventoryPresentation\.render\(\);/, 'Legacy-renderWeaponInventory delegiert nicht an Angular.');
assert.doesNotMatch(legacyWeaponAdapter, /equipmentCompatibility\.getWeaponInventoryPresentation|state\.weaponInventory/, 'Legacy-Waffenadapter rendert weiterhin das Waffenlager selbst.');

assert.match(runtime, /private readonly weaponInventoryPresentation: GameWeaponInventoryPresentationService/, 'GameRuntimeService besitzt keinen Angular-Waffenlager-Präsentationsservice.');
assert.match(runtime, /this\.characterPresentation\.bindActions\(\(\) => \{[\s\S]*this\.weaponInventoryPresentation\.render\(\);[\s\S]*runtime\.renderMarketWeapons\(\);/, 'Kader-Equipmentänderungen aktualisieren Waffenlager und Markt nicht gezielt.');
assert.match(runtime, /this\.weaponInventoryPresentation\.bindActions\(\(\) => \{[\s\S]*this\.characterPresentation\.render\(\);[\s\S]*runtime\.renderMarketWeapons\(\);/, 'Waffenlager-Equipmentänderungen aktualisieren Kader und Markt nicht gezielt.');
assert.match(runtime, /renderInitial\(\): void \{[\s\S]*this\.weaponInventoryPresentation\.render\(\);/, 'Initialer Angular-Render enthält das Waffenlager nicht.');
assert.match(runtime, /if \(forgeCompleted\) \{[\s\S]*this\.weaponInventoryPresentation\.render\(\);/, 'Neue Schmiedewaffen aktualisieren das Angular-Waffenlager nicht.');
assert.doesNotMatch(runtime, /renderWeaponInventory\(\): void;/, 'GameRuntimeApi exportiert weiterhin den Legacy-Waffenlager-Callback.');

const registrationMatch = registration.match(/const ANGULAR_RUNTIME_REGISTRATION = `([\s\S]*?)`;/);
assert.ok(registrationMatch, 'Angular-Runtime-Registrierung konnte nicht gelesen werden.');
assert.doesNotMatch(registrationMatch[1], /\n  renderWeaponInventory,/, 'Legacy-Runtime registriert weiterhin den Waffenlager-Callback bei Angular.');

const bridgeOpen = app.indexOf('this.gameWeaponInventoryPresentation.openLegacyCompatibilityBridge();');
const stateBootstrap = app.indexOf('this.gameState.openBootstrapRegistration();');
assert.ok(bridgeOpen >= 0 && stateBootstrap > bridgeOpen, 'Waffenlager-Präsentationsbrücke muss vor dem Legacy-Bootstrap geöffnet werden.');
assert.match(app, /ngOnDestroy\(\): void \{[\s\S]*this\.gameWeaponInventoryPresentation\.closeLegacyCompatibilityBridge\(\);/);
assert.match(app, /const APP_VERSION = '0\.12\.78';/);

console.log('Waffenlager-Präsentations-Eigentümerschaft: Karten, Sortierung, Belegungsstatus sowie Ausrüsten/Ablegen laufen in Angular; Legacy-Vollrender delegiert nur noch über eine dünne Renderbrücke.');
