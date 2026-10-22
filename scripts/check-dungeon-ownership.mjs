import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appComponent = readFileSync('src/app/app.component.ts', 'utf8');
const dungeonCore = readFileSync('src/app/game/dungeon-core.ts', 'utf8');
const dungeonService = readFileSync('src/app/core/game-dungeon.service.ts', 'utf8');
const sessionService = readFileSync('src/app/core/game-dungeon-session.service.ts', 'utf8');
const presentationService = readFileSync('src/app/core/game-dungeon-presentation.service.ts', 'utf8');
const runtimeService = readFileSync('src/app/core/game-runtime.service.ts', 'utf8');
const dungeonAdapter = readFileSync('src/app/core/legacy-dungeon-domain-adapter.service.ts', 'utf8');
const presentationAdapter = readFileSync('src/app/core/legacy-dungeon-presentation-adapter.service.ts', 'utf8');
const characterPresentationAdapter = readFileSync('src/app/core/legacy-character-presentation-adapter.service.ts', 'utf8');
const registrationAdapter = readFileSync('src/app/core/legacy-runtime-registration-adapter.service.ts', 'utf8');
const dungeonStyles = readFileSync('src/dungeon-modal-v0.15.0.css', 'utf8');
const dungeonData = readFileSync('balancing/tables/dungeons.csv', 'utf8');

for (const pattern of [/getDungeonPhase\(state\)/, /resolveSearchStep\(/, /checkDungeonStart\(/, /payDungeonEnergy\(/, /createDungeonEnemies\(/, /createDungeonAttackPoints\(/, /resolveAttack\(/, /rescheduleDungeonAttack\(/, /getMaterialReferenceById\(/, /addMaterialQuantityById\(/, /getMaterialStorageEntries\(/, /grantCharacterExperience\(/, /characterStatLevelMultiplier\(/, /resetDungeonCycle\(/]) {
  assert.match(dungeonService, pattern, `Dungeon-Service verliert erwartete Fachlogik: ${pattern}`);
}
assert.doesNotMatch(dungeonService, /DUNGEON_LOOT_TABLES|MATERIALS\[/, 'Aktive Dungeon-Drops hängen weiterhin an einer namenbasierten oder alten globalen Loot-Tabelle.');
assert.match(dungeonService, /if \(selected\) result\.push\(\{ materialId: selected\.materialId \}\);/, 'Neue Dungeon-Drops persistieren weiterhin Namen statt ausschließlich Material-IDs.');
assert.match(dungeonService, /normalizeMaterialReferences\(\): number/, 'Dungeon besitzt keine Altstand-Migration für Loot-Referenzen.');
assert.doesNotMatch(dungeonService, /NoBrainerDungeonCompatibility|openLegacyCompatibilityBridge|closeLegacyCompatibilityBridge/, 'GameDungeonService enthält weiterhin die alte Dungeon-Kompatibilitätsbrücke.');

assert.match(dungeonCore, /Dungeon 1 verwendet Energie nicht mehr als Kosten- oder Abbruchsystem/);
assert.match(dungeonCore, /return \{ ok: true, reason: 'Bereit', participants: alive, share: 0, totalCost: 0 \};/);
assert.match(dungeonCore, /payDungeonEnergy[\s\S]*\{\}/, 'Dungeon-Energieabbuchung ist nicht als wirkungsloser Kompatibilitätsanker neutralisiert.');
assert.match(dungeonData, /^1,0,18000000,/m, 'Dungeon 1 muss 0 Energiekosten und 5 Stunden Laufzeit besitzen.');

assert.match(sessionService, /private modalOpen = false;/, 'Dungeon-Sitzung ist nicht an einen expliziten Popup-Zustand gebunden.');
assert.match(sessionService, /open\(at = Date\.now\(\)\)/, 'Dungeon-Sitzung besitzt keinen Popup-Open-Lebenszyklus.');
assert.match(sessionService, /close\(at = Date\.now\(\)\)/, 'Dungeon-Sitzung besitzt keinen Popup-Close-Lebenszyklus.');
assert.match(sessionService, /if \(now - this\.runStartedAt >= this\.getDurationMs\(\)\)/, '5-Stunden-Ende wird nicht im Session-Service geprüft.');
assert.match(sessionService, /finishSession\(state, 'manual', at\)/, 'Manueller Abbruch endet nicht sofort über den Session-Service.');
assert.match(sessionService, /state\.dungeonRun = null;[\s\S]*state\.dungeonSearch = null;[\s\S]*state\.dungeonLootCollect = null;/, 'Popup-Ende verwirft den transienten Dungeon-Zustand nicht vollständig.');
assert.doesNotMatch(sessionService, /state\.dungeonTeamSlots\s*=\s*\[null/, 'Popup-Ende darf die gespeicherte Teamauswahl nicht leeren.');

assert.match(presentationService, /installModalMarkup\(\)/, 'Dungeon 1 wird nicht in ein Angular-eigenes Popup überführt.');
assert.match(presentationService, /openButton\.removeAttribute\('onclick'\)/, 'Der alte Dungeon-1-Seitenlink bleibt aktiv.');
assert.match(presentationService, /overviewAction\.hidden = true/, 'Der alte zweite Dungeon-Hubknopf ist weiterhin sichtbar.');
assert.match(presentationService, /id="dungeonTimeBar"/, 'Dungeon-Popup besitzt keinen Laufzeitbalken.');
assert.match(presentationService, /id="dungeonActiveEnemies"/, 'Dungeon-Popup besitzt keine aktive Gegneranzeige.');
assert.match(presentationService, /id="dungeonCombatLog"/, 'Dungeon-Popup besitzt kein eigenes Live-Protokoll.');
assert.match(presentationService, /class="bar hp"/, 'Gegner-HP werden nicht als Balken dargestellt.');
assert.match(presentationService, /this\.dungeonSession\.toggleRun\(Date\.now\(\)\)/, 'Popup-Aktion delegiert nicht an den Dungeon-Session-Service.');
assert.match(presentationService, /Teamzuweisung ist während eines laufenden Dungeon-Runs gesperrt/, 'Teamänderung wird während des Runs nicht sichtbar gesperrt.');
assert.doesNotMatch(presentationService, /GameEnergyService|EN je Charakter|Energiekosten/, 'Dungeon-Präsentation verwendet weiterhin das alte Energiesystem.');
assert.match(presentationService, /data-dungeon-session-help/, 'Hilfe/Index wird für den neuen Dungeon-Ablauf nicht ergänzt.');
assert.match(dungeonStyles, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/, 'Die vier Charakterplätze bleiben nicht als 2x2-Raster erhalten.');

assert.doesNotMatch(dungeonAdapter, /DUNGEON_UI_BRIDGE|NoBrainerDungeonCompatibility|toggleDungeonAuto|collectDungeonLoot/, 'Der Legacy-Dungeon-Domain-Adapter enthält weiterhin Kompatibilitätswrapper.');
assert.match(dungeonAdapter, /return source\.slice\(0, start\) \+ source\.slice\(end\);/, 'Der Legacy-Dungeon-Domainbereich wird nicht vollständig entfernt.');
assert.doesNotMatch(presentationAdapter, /NoBrainerDungeonPresentationCore|getDungeonStatusPresentation|getDungeonLootPresentation/, 'Der Legacy-Dungeon-Präsentationsadapter registriert weiterhin einen Presentation-Core oder baut Legacy-Renderer auf.');
assert.doesNotMatch(characterPresentationAdapter, /ADAPTED_DUNGEON_TEAM|ADAPTED_DUNGEON_TEAM_PICKER/, 'Der Charakter-Präsentationsadapter erzeugt weiterhin eine zweite Dungeon-Team-Präsentation.');

assert.match(runtimeService, /private readonly gameDungeon: GameDungeonService/, 'GameRuntimeService besitzt keinen Angular-Dungeon-Service.');
assert.match(runtimeService, /private readonly dungeonSession: GameDungeonSessionService/, 'GameRuntimeService besitzt keine popupgebundene Dungeon-Sitzung.');
assert.match(runtimeService, /const dungeonUpdate = this\.dungeonSession\.update\(\);[\s\S]*this\.applyDungeonResult\(runtime, dungeonUpdate\);/, 'Der Angular-Tick aktualisiert nicht ausschließlich die geöffnete Dungeon-Sitzung.');
assert.match(runtimeService, /this\.dungeonPresentation\.addEvent\(event\.text, event\.className\);/, 'Dungeon-Ereignisse werden nicht in das Live-Popup-Protokoll geleitet.');
assert.match(runtimeService, /const dungeonSessionReset = this\.dungeonSession\.close\(Date\.now\(\)\);/, 'Persistierter alter Dungeon-Lauf wird beim Runtime-Start nicht beendet.');
assert.doesNotMatch(runtimeService, /const dungeonUpdate = this\.gameDungeon\.update\(\)/, 'Runtime verarbeitet den Dungeon weiterhin außerhalb des Popup-Session-Gates.');
assert.match(runtimeService, /renderInventoryState\(\): void;/, 'GameRuntimeApi stellt keinen gezielten Inventar-Refresh bereit.');

const registrationMatch = registrationAdapter.match(/const ANGULAR_RUNTIME_REGISTRATION = `([\s\S]*?)`;/);
assert.ok(registrationMatch, 'Die Angular-Runtime-Registrierung konnte nicht gelesen werden.');
assert.doesNotMatch(registrationMatch[1], /renderDungeonStatus,|renderDungeonLoot,|renderTeam:|updateDungeonAutomation,/, 'Legacy-Runtime exportiert weiterhin Dungeon-Fach- oder Präsentationscallbacks.');
assert.doesNotMatch(appComponent, /GameDungeonService|NoBrainerDungeonCompatibility|gameDungeon\.openLegacyCompatibilityBridge|gameDungeon\.closeLegacyCompatibilityBridge/, 'AppComponent verwaltet weiterhin die alte Dungeon-Kompatibilitätsbrücke.');
assert.match(appComponent, /const APP_VERSION = APP_UI_VERSION;/, 'Der Dungeon-Cutover verwendet nicht die gemeinsame App-Version.');

console.log('Dungeon-Eigentümerschaft: Kampf/Loot bleiben Angular-Fachlogik; Popup-Lebenszyklus, 5-Stunden-Limit, Gegnerbalken und Live-Protokoll liegen in der Angular-Session/Präsentation.');
