import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/app/app.component.ts', 'utf8');
const service = readFileSync('src/app/core/game-character-presentation.service.ts', 'utf8');
const assetResolver = readFileSync('src/app/game/character-class-asset-presentation.ts', 'utf8');
const weaponPresentationService = readFileSync('src/app/core/game-weapon-presentation.service.ts', 'utf8');
const runtime = readFileSync('src/app/core/game-runtime.service.ts', 'utf8');
const registration = readFileSync('src/app/core/legacy-runtime-registration-adapter.service.ts', 'utf8');
const characterAdapter = readFileSync('src/app/core/legacy-character-presentation-adapter.service.ts', 'utf8');
const equipmentAdapter = readFileSync('src/app/core/legacy-equipment-adapter.service.ts', 'utf8');
const angularConfig = JSON.parse(readFileSync('angular.json', 'utf8'));
const characterCss = readFileSync('src/character-selection-v0.16.0.css', 'utf8');
const weaponImageCss = readFileSync('src/weapon-images-v0.17.0.css', 'utf8');

assert.match(service, /constructor\([\s\S]*private readonly gameState: GameStateService,[\s\S]*private readonly gameEquipment: GameEquipmentService,[\s\S]*private readonly weaponPresentation: GameWeaponPresentationService/);
assert.match(service, /getCharacterCardPresentation\(/, 'Angular-Kaderdarstellung nutzt den Character-Presentation-Core nicht.');
assert.match(service, /calculateCharacterStats\([\s\S]*character\.classId,[\s\S]*this\.getEquippedWeapons\(character\),[\s\S]*characterStatLevelMultiplier\(character\.level\)[\s\S]*\)/, 'Angular-Kader löst Level-, Klassen- und Waffenboni nicht über das gemeinsame Statmodell auf.');
assert.match(weaponPresentationService, /createWeaponPresentationCore\(/, 'Gemeinsame Angular-Waffenpräsentation nutzt den Weapon-Presentation-Core nicht.');
assert.match(weaponPresentationService, /mode: WeaponImageRenderMode = 'complete'[\s\S]*weaponImagePresentation\.render\(weapon, mode/, 'Gemeinsame Angular-Waffenpräsentation stellt keinen zentralen Bildrenderer bereit.');
assert.match(service, /weaponPresentation\.renderCard\(/, 'Angular-Kader nutzt die gemeinsame Waffenkarten-Präsentation nicht.');
assert.match(service, /weaponPresentation\.renderImage\([\s\S]*'roster-equipped-weapon-image'/, 'Ausgerüstete Kaderwaffen verwenden nicht den gemeinsamen Waffenbild-Renderer.');
assert.doesNotMatch(service, /GameWeaponImagePresentationService|getWeaponImageRenderPlan|getWeaponImageMarkup/, 'Der Kader darf keine eigene Waffenbildlogik aufbauen.');
assert.match(service, /weaponDamageAfterArmor\(weapon, 0, stats\)\.raw/, 'Die gemeinsame Waffen-/Charakter-Offensivberechnung wird im Kader nicht wiederverwendet.');
assert.match(service, /gameEquipment\.getWeaponPickerPresentation\(/, 'Waffenpicker liest Equipment-Zustand nicht über den Angular-Service.');
assert.match(service, /gameEquipment\.equipWeapon\(/, 'Waffenpicker rüstet nicht über den Angular-Equipment-Service aus.');
assert.match(service, /gameEquipment\.unequipHand\(/, 'Waffenpicker legt nicht über den Angular-Equipment-Service ab.');
assert.match(service, /data-roster-presentation-owner="angular"/, 'Der Kader besitzt keinen Angular-Ownership-Marker.');
assert.match(service, /character-selection-page roster-selection-page/, 'Die Kaderseite ist nicht auf die reine Auswahlansicht reduziert.');
assert.match(service, /data-character-modal="roster"/, 'Die Charakterdetails liegen nicht in einem eigenen Modal.');
assert.match(service, /data-roster-action="close-detail"/, 'Das Charaktermodal besitzt keine eigene Schließen-Aktion.');
assert.match(service, /class="character-list-item roster-list-item/, 'Die kompakte Kaderliste fehlt.');
assert.match(service, /class="class-emblem class-emblem-small" data-class-id=/, 'Kleine Klassenembleme werden nicht über stabile Klassen-IDs zugeordnet.');
assert.match(service, /class="class-emblem class-emblem-large" data-class-id=/, 'Große Klassenembleme werden nicht über stabile Klassen-IDs zugeordnet.');
assert.match(service, /resolveCharacterAssetId\(character\.classId\)/, 'Kaderassets verwenden nicht die gemeinsame stabile Klassen-ID-Auflösung.');
assert.match(service, /data-roster-action="edit-name"/, 'Das Umbenennen besitzt keinen kleinen Kader-Aktionsanker.');
assert.match(service, /data-roster-action="save-name"/, 'Das Umbenennen besitzt keine explizite Speicheraktion.');
assert.match(service, /data-roster-action="stat-page-prev"/, 'Die Werteseiten besitzen keine Rückwärtsnavigation.');
assert.match(service, /data-roster-action="stat-page-next"/, 'Die Werteseiten besitzen keine Vorwärtsnavigation.');
assert.match(service, /class="roster-equipment-layer"/, 'Das Detailmodal besitzt keinen kompakten Ausrüstungs-Layer.');
assert.match(service, /class="roster-equipment-slot\$\{weapon \? ' has-weapon' : ''\}/, 'Belegte Hand-Slots besitzen keinen eigenen Bildlayout-Marker.');
assert.match(service, /class="roster-equipment-copy"/, 'Hand-Slot-Texte sind nicht vom Waffenbildlayout getrennt.');
assert.match(service, /data-roster-action="toggle-picker"/, 'Angular-Kader besitzt keinen eigenen Picker-Aktionsanker.');
assert.match(service, /data-roster-action="equip-weapon"/, 'Angular-Kader besitzt keinen eigenen Ausrüsten-Aktionsanker.');
assert.match(service, /data-roster-action="clear-hand"/, 'Angular-Kader besitzt keinen eigenen Ablegen-Aktionsanker.');
assert.match(service, /renderIfIdle\(\): void/, 'Der Angular-Kader besitzt keinen fokus-schonenden Tick-Render.');
assert.match(assetResolver, /'recruit'[\s\S]*'fighter'[\s\S]*'archer'[\s\S]*'scholar'/, 'Klassenassets sind nicht über die stabilen Klassen-IDs definiert.');
assert.doesNotMatch(service, /className\s*===|name\s*===\s*['"](?:Rekrut|Kämpfer|Bogner|Gelehrter)/, 'Klassenassets dürfen nicht über sichtbare Klassennamen identifiziert werden.');

for (const classId of ['archer', 'scholar', 'recruit', 'fighter']) {
  assert.match(characterCss, new RegExp(`class-emblem-small\\[data-class-id=\\"${classId}\\"\\][^}]*${classId}-small\\.png`), `Kleines Einzelasset für ${classId} fehlt.`);
  assert.match(characterCss, new RegExp(`class-emblem-large\\[data-class-id=\\"${classId}\\"\\][^}]*${classId}-large-v0\\.16\\.1\\.png`), `Großes v0.16.1-Einzelasset für ${classId} fehlt.`);
}
assert.match(characterCss, /background-size:\s*contain/, 'Klassenembleme werden nicht vollständig skaliert.');
assert.doesNotMatch(characterCss, /class-emblems-(?:compact|detail)\.png|background-position:\s*-/, 'Das fehleranfällige Sprite-Cropping ist noch aktiv.');
assert.match(weaponImageCss, /\.roster-equipment-slot\.has-weapon\s*\{[\s\S]*grid-template-columns:\s*64px minmax\(0, 1fr\)/, 'Belegte Hand-Slots reservieren keinen 64px-Bildbereich.');
assert.match(weaponImageCss, /\.roster-equipped-weapon-image\s*\{[\s\S]*flex:\s*0 0 64px/, 'Das ausgerüstete Waffenbild besitzt keine stabile 64px-Größe.');
assert.match(weaponImageCss, /\.roster-emblem-stage\s*\{[\s\S]*padding-bottom:\s*96px/, 'Der Kader reserviert keinen Platz für die höheren Waffen-Slots.');
assert.ok((angularConfig.projects?.nobrainer?.architect?.build?.options?.styles ?? []).includes('src/character-selection-v0.16.0.css'));
assert.ok((angularConfig.projects?.nobrainer?.architect?.build?.options?.styles ?? []).includes('src/weapon-images-v0.17.0.css'));

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

console.log('Character-Präsentations-Eigentümerschaft: Kaderliste und Charaktermodal sind getrennt; ID-basierte Klassenassets sowie zentral gerenderte 64px-Waffenbilder bleiben Angular-eigen, ohne eigene Waffenbildlogik im Kader.');
