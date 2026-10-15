import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appComponent = readFileSync('src/app/app.component.ts', 'utf8');
const equipmentService = readFileSync('src/app/core/game-equipment.service.ts', 'utf8');
const equipmentAdapter = readFileSync('src/app/core/legacy-equipment-adapter.service.ts', 'utf8');
const weaponPresentationAdapter = readFileSync('src/app/core/legacy-weapon-presentation-adapter.service.ts', 'utf8');

assert.match(equipmentService, /constructor\(private readonly gameState: GameStateService\)/);
assert.match(equipmentService, /return equipWeapon\(this\.characters\(\), Number\(weaponId\), hand, Number\(characterId\)\);/);
assert.match(equipmentService, /return unequipHand\(this\.characters\(\), Number\(characterId\), hand\);/);
assert.match(equipmentService, /window\.NoBrainerEquipmentCompatibility = \{/);
assert.match(equipmentService, /delete window\.NoBrainerEquipmentCompatibility;/);

assert.doesNotMatch(equipmentAdapter, /EQUIPMENT_CORE_BRIDGE|NoBrainerEquipmentCore/);
assert.match(equipmentAdapter, /equipmentCompatibility\.getWeaponEquipLocation\(Number\(weaponId\)\)/);
assert.match(equipmentAdapter, /equipmentCompatibility\.equipWeapon\(Number\(weaponId\),hand,Number\(characterId\)\)/);
assert.match(equipmentAdapter, /equipmentCompatibility\.unequipHand\(Number\(characterId\),hand\)/);
assert.match(equipmentAdapter, /equipmentCompatibility\.getWeaponPickerPresentation\(Number\(w\.id\),Number\(c\.id\),hand\)/);

assert.doesNotMatch(weaponPresentationAdapter, /NoBrainerEquipmentCore/);
assert.match(weaponPresentationAdapter, /equipmentCompatibility\.getWeaponInventoryPresentation\(Number\(w\.id\)\)/);

const bridgeOpen = appComponent.indexOf('this.gameEquipment.openLegacyCompatibilityBridge();');
const stateBootstrap = appComponent.indexOf('this.gameState.openBootstrapRegistration();');
assert.ok(bridgeOpen >= 0 && stateBootstrap > bridgeOpen, 'Equipment-Bridge muss vor dem State-/Legacy-Bootstrap geöffnet werden.');
assert.match(appComponent, /ngOnDestroy\(\): void \{[\s\S]*this\.gameEquipment\.closeLegacyCompatibilityBridge\(\);/);
assert.match(appComponent, /const APP_VERSION = '0\.12\.73';/);

console.log('Equipment-Eigentümerschaft: Ausrüsten, Ablegen und Equipment-Abfragen laufen über den Angular-Service auf dem Angular-State; Legacy-Code delegiert nur noch UI-Aktionen.');
