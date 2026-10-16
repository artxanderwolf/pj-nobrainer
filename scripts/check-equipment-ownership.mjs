import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appComponent = readFileSync('src/app/app.component.ts', 'utf8');
const equipmentService = readFileSync('src/app/core/game-equipment.service.ts', 'utf8');
const characterPresentationService = readFileSync('src/app/core/game-character-presentation.service.ts', 'utf8');
const weaponInventoryPresentationService = readFileSync('src/app/core/game-weapon-inventory-presentation.service.ts', 'utf8');
const equipmentAdapter = readFileSync('src/app/core/legacy-equipment-adapter.service.ts', 'utf8');
const weaponPresentationAdapter = readFileSync('src/app/core/legacy-weapon-presentation-adapter.service.ts', 'utf8');

assert.match(equipmentService, /constructor\(private readonly gameState: GameStateService\)/);
assert.match(equipmentService, /return equipWeapon\(this\.characters\(\), Number\(weaponId\), hand, Number\(characterId\)\);/);
assert.match(equipmentService, /return unequipHand\(this\.characters\(\), Number\(characterId\), hand\);/);
assert.match(equipmentService, /getWeaponPickerPresentation\(weaponId: number, characterId: number, hand: string\)/);
assert.match(equipmentService, /window\.NoBrainerEquipmentCompatibility = \{/);
assert.match(equipmentService, /delete window\.NoBrainerEquipmentCompatibility;/);

assert.doesNotMatch(equipmentAdapter, /EQUIPMENT_CORE_BRIDGE|NoBrainerEquipmentCore/);
assert.match(equipmentAdapter, /equipmentCompatibility\.getWeaponEquipLocation\(Number\(weaponId\)\)/);
assert.match(equipmentAdapter, /equipmentCompatibility\.equipWeapon\(Number\(weaponId\),hand,Number\(characterId\)\)/);
assert.match(equipmentAdapter, /equipmentCompatibility\.unequipHand\(Number\(characterId\),hand\)/);
assert.doesNotMatch(equipmentAdapter, /getWeaponPickerPresentation/, 'Legacy-Equipment-Adapter besitzt weiterhin die Kader-Waffenpicker-Präsentation.');
assert.match(characterPresentationService, /gameEquipment\.getWeaponPickerPresentation\(weapon\.id, character\.id, handPresentation\.hand\)/);
assert.match(weaponInventoryPresentationService, /gameEquipment\.getWeaponInventoryPresentation\(weapon\.id\)/);
assert.match(weaponInventoryPresentationService, /gameEquipment\.equipWeapon\(weaponId, hand, characterId\)/);
assert.match(weaponInventoryPresentationService, /gameEquipment\.unequipHand\(characterId, hand\)/);

assert.doesNotMatch(weaponPresentationAdapter, /NoBrainerEquipmentCore|equipmentCompatibility\.getWeaponInventoryPresentation/);
assert.match(weaponPresentationAdapter, /weaponInventoryPresentation\.render\(\);/);

const bridgeOpen = appComponent.indexOf('this.gameEquipment.openLegacyCompatibilityBridge();');
const stateBootstrap = appComponent.indexOf('this.gameState.openBootstrapRegistration();');
assert.ok(bridgeOpen >= 0 && stateBootstrap > bridgeOpen, 'Equipment-Bridge muss vor dem State-/Legacy-Bootstrap geöffnet werden.');
assert.match(appComponent, /ngOnDestroy\(\): void \{[\s\S]*this\.gameEquipment\.closeLegacyCompatibilityBridge\(\);/);
assert.match(appComponent, /const APP_VERSION = '0\.12\.84';/);

console.log('Equipment-Eigentümerschaft: Ausrüsten und Ablegen laufen über den Angular-Service; Kader und Waffenlager greifen für ihre Equipment-Präsentation direkt auf ihn zu.');
